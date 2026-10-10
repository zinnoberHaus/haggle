import { z } from "zod";
import type { Deal } from "./feed-types";

export const MAX_COST_CENTS = 10_000_000;
const cents = z.number().int().min(0).max(MAX_COST_CENTS);
const note = z.string().trim().max(600);
const sourceUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use a complete http or https source URL.");

export const costInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name this worksheet.").max(150),
    offerId: z
      .string()
      .regex(/^dn-[a-f0-9]{24}$/)
      .nullable(),
    itemPriceCents: cents,
    couponCents: cents,
    couponAlreadyIncluded: z.boolean(),
    couponCode: z.string().trim().max(100),
    couponNotes: note,
    couponSourceUrl: sourceUrl,
    shippingCents: cents.nullable(),
    taxCents: cents.nullable(),
    cashbackCents: cents,
    cashbackNotes: note,
    cashbackSourceUrl: sourceUrl,
    cardRewardCents: cents,
    cardRewardNotes: note,
    cardRewardSourceUrl: sourceUrl,
    notes: note,
  })
  .strict()
  .superRefine((input, ctx) => {
    const additionalCoupon = input.couponAlreadyIncluded
      ? 0
      : input.couponCents;
    if (additionalCoupon > input.itemPriceCents) {
      ctx.addIssue({
        code: "custom",
        path: ["couponCents"],
        message: "An additional coupon cannot exceed the item price.",
      });
    }
    const knownSubtotal =
      input.itemPriceCents -
      additionalCoupon +
      (input.shippingCents ?? 0) +
      (input.taxCents ?? 0);
    if (knownSubtotal > MAX_COST_CENTS) {
      ctx.addIssue({
        code: "custom",
        path: ["itemPriceCents"],
        message: "The known checkout cost cannot exceed $100,000.",
      });
    }
    if (
      input.cashbackCents + input.cardRewardCents >
      Math.max(0, knownSubtotal)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["cashbackCents"],
        message:
          "Combined rewards cannot exceed the known checkout subtotal. Unknown costs cannot justify a larger reward.",
      });
    }
    for (const kind of ["cashback", "cardReward"] as const) {
      if (input[`${kind}Cents`] > 0) {
        if (!input[`${kind}Notes`])
          ctx.addIssue({
            code: "custom",
            path: [`${kind}Notes`],
            message:
              "Add eligibility and timing notes for each potential reward.",
          });
        if (!input[`${kind}SourceUrl`])
          ctx.addIssue({
            code: "custom",
            path: [`${kind}SourceUrl`],
            message: "Add a source URL for each potential reward.",
          });
      }
    }
  });

export type CostInput = z.infer<typeof costInputSchema>;
export type CostResult = {
  additionalCouponCents: number;
  itemAfterCouponCents: number;
  knownSubtotalCents: number;
  unknownCosts: ("shipping" | "tax")[];
  payNowCents: number | null;
  potentialRewardsCents: number;
  conditionalNetCents: number | null;
};
export type OfferSnapshot = Pick<
  Deal,
  | "id"
  | "title"
  | "priceCents"
  | "priceType"
  | "status"
  | "fetchedAt"
  | "sourceUrl"
  | "sourceName"
>;
export type SavedComparison = {
  id: string;
  input: CostInput;
  result: CostResult;
  sourceSnapshot: OfferSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

/** Decimal text is converted without binary floating-point rounding or coercion. */
export function parseDollarInput(
  value: string,
  allowUnknown = false,
): number | null {
  const text = value.trim();
  if (!text && allowUnknown) return null;
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(text))
    throw new Error(
      "Enter dollars with up to two decimal places, without commas or currency symbols.",
    );
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (result > MAX_COST_CENTS)
    throw new Error("Each amount must be between $0 and $100,000.");
  return result;
}

export function calculateCost(value: unknown): CostResult {
  const input = costInputSchema.parse(value);
  const additionalCouponCents = input.couponAlreadyIncluded
    ? 0
    : input.couponCents;
  const itemAfterCouponCents = input.itemPriceCents - additionalCouponCents;
  const knownSubtotalCents =
    itemAfterCouponCents + (input.shippingCents ?? 0) + (input.taxCents ?? 0);
  const unknownCosts: CostResult["unknownCosts"] = [];
  if (input.shippingCents === null) unknownCosts.push("shipping");
  if (input.taxCents === null) unknownCosts.push("tax");
  const payNowCents = unknownCosts.length ? null : knownSubtotalCents;
  const potentialRewardsCents = input.cashbackCents + input.cardRewardCents;
  return {
    additionalCouponCents,
    itemAfterCouponCents,
    knownSubtotalCents,
    unknownCosts,
    payNowCents,
    potentialRewardsCents,
    conditionalNetCents:
      payNowCents === null ? null : payNowCents - potentialRewardsCents,
  };
}

export function snapshotOffer(deal: Deal): OfferSnapshot {
  const {
    id,
    title,
    priceCents,
    priceType,
    status,
    fetchedAt,
    sourceUrl,
    sourceName,
  } = deal;
  return {
    id,
    title,
    priceCents,
    priceType,
    status,
    fetchedAt,
    sourceUrl,
    sourceName,
  };
}

export function offerWarnings(
  input: CostInput,
  source: OfferSnapshot | null,
): string[] {
  if (!source)
    return input.offerId
      ? [
          "The linked offer is unavailable. Your entered price has been retained.",
        ]
      : [];
  const warnings: string[] = [];
  if (source.status !== "active")
    warnings.push(
      "This offer is stale or unavailable. Check the source before buying.",
    );
  if (source.priceCents === null)
    warnings.push(
      "The source does not provide an exact item price. Your entered price is an assumption.",
    );
  else if (source.priceCents !== input.itemPriceCents)
    warnings.push(
      "Your entered item price differs from the latest collected source price. Your entry has been retained.",
    );
  if (source.priceType === "from")
    warnings.push(
      "The source lists a starting price; the option you choose may cost more.",
    );
  return warnings;
}

export function emptyCostInput(source: OfferSnapshot | null = null): CostInput {
  return {
    name: source?.title.slice(0, 150) ?? "My cost comparison",
    offerId: source?.id ?? null,
    itemPriceCents: source?.priceCents ?? 0,
    couponCents: 0,
    couponAlreadyIncluded: true,
    couponCode: "",
    couponNotes: "",
    couponSourceUrl: "",
    shippingCents: null,
    taxCents: null,
    cashbackCents: 0,
    cashbackNotes: "",
    cashbackSourceUrl: "",
    cardRewardCents: 0,
    cardRewardNotes: "",
    cardRewardSourceUrl: "",
    notes: "",
  };
}
