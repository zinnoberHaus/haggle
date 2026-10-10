import { z } from "zod";

export const MAX_PURCHASE_CENTS = 100_000_000;
const cents = z.number().int().min(0).max(MAX_PURCHASE_CENTS);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01"
    );
  }, "Enter a valid calendar date.");
export const policyUrlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !!url.hostname &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Use the retailer’s HTTPS policy link, without login details.")
  .transform((value) => new URL(value).toString())
  .pipe(z.string().max(2000));
export const purchaseFields = z
  .object({
    cartPlanId: z.uuid().nullable().default(null),
    offerId: z
      .string()
      .regex(/^dn-[a-f0-9]{24}$/)
      .nullable()
      .default(null),
    productName: z.string().trim().min(2).max(150),
    merchant: z.string().trim().min(1).max(100),
    purchasedOn: isoDate.refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      "A purchase date cannot be in the future.",
    ),
    paidTotalCents: cents.min(1),
    baselineTotalCents: cents.nullable().default(null),
    policyUrl: policyUrlSchema.nullable().default(null),
    adjustmentDeadline: isoDate.nullable().default(null),
    adjustmentStatus: z
      .enum(["draft", "submitted", "received", "rejected"])
      .default("draft"),
    refundCents: cents.default(0),
  })
  .strict();

function checkAmounts(
  value: z.infer<typeof purchaseFields>,
  ctx: z.RefinementCtx,
) {
  if (value.refundCents > value.paidTotalCents) {
    ctx.addIssue({
      code: "custom",
      path: ["refundCents"],
      message: "A refund cannot exceed the total you paid.",
    });
  }
  if (value.adjustmentStatus !== "received" && value.refundCents !== 0) {
    ctx.addIssue({
      code: "custom",
      path: ["refundCents"],
      message: "Only money you have received belongs in the refund total.",
    });
  }
  if (value.adjustmentStatus === "received" && value.refundCents === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["refundCents"],
      message:
        "Enter the refund you actually received, or choose another status.",
    });
  }
  if (
    value.adjustmentDeadline &&
    value.adjustmentDeadline < value.purchasedOn
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["adjustmentDeadline"],
      message: "The adjustment deadline cannot precede your purchase.",
    });
  }
}
export const purchaseInputSchema = purchaseFields.superRefine(checkAmounts);
// Editing replaces the editable fields as a unit so status and money cannot diverge.
export const purchaseUpdateSchema = purchaseFields
  .extend({ id: z.uuid() })
  .superRefine(checkAmounts);
export const purchaseIdSchema = z.object({ id: z.uuid() }).strict();
export type PurchaseInput = z.infer<typeof purchaseInputSchema>;
export type Purchase = PurchaseInput & {
  id: string;
  reportedSavingsCents: number;
  feeCents: 0;
  createdAt: string;
  updatedAt: string;
};
export type ObservedPurchaseOffer = {
  id: string;
  title: string;
  merchant: string;
  priceCents: number | null;
  priceType: "exact" | "from" | "unknown";
  sourceName: string;
  sourceUrl: string;
  fetchedAt: string;
  status: "active" | "unavailable";
};

/** Decimal input is parsed as cents, never rounded from binary floating point. */
export function dollarsToCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result <= MAX_PURCHASE_CENTS
    ? result
    : null;
}
export function reportedPurchaseAmounts(
  value: Pick<
    PurchaseInput,
    "paidTotalCents" | "baselineTotalCents" | "adjustmentStatus" | "refundCents"
  >,
) {
  return {
    reportedSavingsCents:
      value.baselineTotalCents === null
        ? 0
        : Math.max(value.baselineTotalCents - value.paidTotalCents, 0),
    receivedRefundCents:
      value.adjustmentStatus === "received" ? value.refundCents : 0,
    feeCents: 0 as const,
  };
}
export function summarizePurchases(purchases: PurchaseInput[]) {
  return purchases.reduce(
    (totals, purchase) => {
      const amounts = reportedPurchaseAmounts(purchase);
      totals.reportedSavingsCents += amounts.reportedSavingsCents;
      totals.receivedRefundCents += amounts.receivedRefundCents;
      totals.purchaseCount += 1;
      return totals;
    },
    {
      reportedSavingsCents: 0,
      receivedRefundCents: 0,
      feeCents: 0 as const,
      purchaseCount: 0,
    },
  );
}

export type PurchaseReferenceLookup = {
  getPlanOwner: (planId: string) => Promise<string | null>;
  offerExists: (offerId: string) => Promise<boolean>;
};
/** The user ID comes only from the validated session, never the purchase body. */
export async function validatePurchaseReferences(
  input: PurchaseInput,
  userId: string,
  lookup: PurchaseReferenceLookup,
) {
  const [owner, validOffer] = await Promise.all([
    input.cartPlanId
      ? lookup.getPlanOwner(input.cartPlanId)
      : Promise.resolve(userId),
    input.offerId ? lookup.offerExists(input.offerId) : Promise.resolve(true),
  ]);
  if (owner !== userId)
    return "This shopping plan is not available to your account.";
  if (!validOffer)
    return "Choose an offer in Haggle, or remove the offer link.";
  return null;
}

const usd = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function buildAdjustmentRequest(
  purchase: PurchaseInput,
  offer: ObservedPurchaseOffer | null,
  name: string,
) {
  const lines = [
    `Subject: Price-adjustment review for ${purchase.productName}`,
    "",
    `Hello ${purchase.merchant} support,`,
    "",
    `I purchased ${purchase.productName} on ${purchase.purchasedOn}. My recorded paid total is ${usd(purchase.paidTotalCents)}.`,
    "Order number: [add your order number before sending]",
  ];
  if (offer) {
    lines.push(
      "",
      `An offer I would like you to review: ${offer.title}`,
      `Source: ${offer.sourceName} — ${offer.sourceUrl}`,
    );
    if (offer.priceCents !== null)
      lines.push(
        `Publisher’s ${offer.priceType === "from" ? "starting " : ""}item price: ${usd(offer.priceCents)}, retrieved ${offer.fetchedAt.slice(0, 10)}.`,
      );
    if (offer.status !== "active")
      lines.push("This is a past observation and may no longer be available.");
  }
  if (purchase.policyUrl)
    lines.push("", `Policy link I found: ${purchase.policyUrl}`);
  if (purchase.adjustmentDeadline)
    lines.push(
      `Deadline I recorded: ${purchase.adjustmentDeadline} (please confirm).`,
    );
  lines.push(
    "",
    "Could you confirm whether my purchase qualifies for a price adjustment under your current policy, and what information you need? The advertised item price may exclude shipping, tax, or membership conditions, so I am not treating it as a confirmed refund amount.",
    "",
    "Thank you,",
    name.trim() || "[your name]",
  );
  return lines.join("\n");
}
