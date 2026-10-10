import { z } from "zod";
import type { Deal } from "./feed-types";

export const cartReviewInputSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(2).max(150),
    originalPriceCents: z.number().int().min(1).max(10_000_000),
  }).strict()).min(1).max(10),
}).strict();
export type CartReviewItem = z.infer<typeof cartReviewInputSchema>["items"][number];

const reviewSchema = z.object({
  itemIndex: z.number().int().min(0).max(9),
  advice: z.string().trim().min(1).max(500),
  offerIds: z.array(z.string().min(1).max(200)).max(3),
}).strict();
export const cartReviewModelSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  reviews: z.array(reviewSchema).max(10),
}).strict();

export type CartReviewResponse = {
  summary: string;
  reviews: { itemIndex: number; advice: string; offerIds: string[] }[];
  sources: Pick<Deal, "id" | "title" | "priceCents" | "sourceName" | "sourceUrl">[];
};

/** Only exact, recent, still-active item prices are eligible for recommendations. */
export function eligibleReviewOffers(
  items: CartReviewItem[], deals: Deal[], now = Date.now(),
): Deal[] {
  const seen = new Set<string>();
  return deals.filter((deal) => {
    const fetched = Date.parse(deal.fetchedAt);
    const expiry = deal.expiresAt === null ? Infinity : Date.parse(deal.expiresAt);
    const valid = !seen.has(deal.id) && deal.status === "active" &&
      deal.priceType === "exact" && Number.isSafeInteger(deal.priceCents) &&
      deal.priceCents !== null && deal.priceCents > 0 &&
      Number.isFinite(fetched) && fetched > now - 48 * 60 * 60 * 1000 &&
      expiry > now && items.some((item) => deal.priceCents! < item.originalPriceCents);
    if (valid) seen.add(deal.id);
    return valid;
  }).slice(0, 60);
}

const defaultSummary =
  "Review each candidate before choosing. Advertised item prices are not final checkout totals, and product suitability needs your confirmation.";
const candidateAdvice =
  "Compare the linked candidates carefully. Check the exact model, size, seller, and exclusions, then confirm shipping and tax at the source.";
const emptyAdvice =
  "No suitable lower-price candidate was confirmed for this item in the supplied feed. Check the item details or keep your original choice.";

// Model prose is plain text only. Monetary assertions, external links, claims of
// completed actions or guaranteed equivalence do not belong in this advice.
// This is an additional guard, not proof that every qualitative claim is correct.
const unsupportedProse = /https?:|www\.|javascript:|data:|<[^>]*>|\b\S+\.(?:com|net|org|io)\b|[$€£]|\b(?:USD|dollars?|cents?)\b|\d\s*%|\b(?:identical|equivalent|guaranteed|bought|ordered|purchased|charged|activated|refunded|completed)\b|\b(?:same product|saved you|order placed|placed (?:the |your |an? )?order|final (?:price|total)|checkout total)\b/i;
function safeProse(value: string): boolean {
  return !unsupportedProse.test(value);
}

/**
 * Ground only against the exact feed subset supplied to this model call.
 * Identity, URLs, source prices and totals are never accepted from model output.
 */
export function groundCartReview(
  items: CartReviewItem[], suppliedOffers: Deal[], output: unknown, now = Date.now(),
): CartReviewResponse {
  const parsed = cartReviewModelSchema.parse(output);
  const offers = new Map(eligibleReviewOffers(items, suppliedOffers, now).map((deal) => [deal.id, deal]));
  const reviews = items.map((_, itemIndex) => ({ itemIndex, advice: emptyAdvice, offerIds: [] as string[] }));
  const seenItems = new Set<number>();
  let adjusted = false;
  for (const proposed of parsed.reviews) {
    const item = items[proposed.itemIndex];
    if (!item || seenItems.has(proposed.itemIndex)) {
      adjusted = true;
      continue;
    }
    seenItems.add(proposed.itemIndex);
    const ids = [...new Set(proposed.offerIds)].filter((id) => {
      const offer = offers.get(id);
      return offer && offer.priceCents !== null && offer.priceCents < item.originalPriceCents;
    });
    // If an ID is rejected, prose may refer to that rejected offer too.
    const grounded = ids.length === proposed.offerIds.length && safeProse(proposed.advice);
    if (!grounded) adjusted = true;
    reviews[proposed.itemIndex] = {
      itemIndex: proposed.itemIndex,
      advice: grounded ? proposed.advice : ids.length ? candidateAdvice : emptyAdvice,
      offerIds: ids,
    };
  }
  const usedIds = new Set(reviews.flatMap((review) => review.offerIds));
  return {
    summary: !adjusted && seenItems.size === items.length && safeProse(parsed.summary)
      ? parsed.summary : defaultSummary,
    reviews,
    sources: [...offers.values()].filter((deal) => usedIds.has(deal.id)).map((deal) => ({
      id: deal.id, title: deal.title, priceCents: deal.priceCents,
      sourceName: deal.sourceName, sourceUrl: deal.sourceUrl,
    })),
  };
}
