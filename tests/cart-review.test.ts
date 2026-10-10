import assert from "node:assert/strict";
import test from "node:test";
import {
  cartReviewInputSchema, cartReviewModelSchema,
  eligibleReviewOffers, groundCartReview,
} from "../src/lib/cart-review";
import type { Deal } from "../src/lib/feed-types";

const now = Date.parse("2026-10-10T12:00:00Z");
const items = [
  { name: "Headphones", originalPriceCents: 10_000 },
  { name: "Small speaker", originalPriceCents: 3_000 },
];
function offer(id: string, changes: Partial<Deal> = {}): Deal {
  return {
    id, title: `Published ${id}`, description: "Publisher details", image: null,
    sourceUrl: `https://www.dealnews.com/${id}?iref=rss`, sourceGuid: id,
    sourceName: "DealNews", sourceLinks: [],
    publishedAt: "2026-10-10T10:00:00Z", fetchedAt: "2026-10-10T11:00:00Z",
    expiresAt: null, priceCents: 5_000, originalPriceCents: null,
    priceType: "exact", category: "Electronics", sourceCategory: "Audio",
    merchant: "Publisher retailer", shipping: null, status: "active", ...changes,
  };
}
const prose = "Check the fit and return terms before considering these alternatives.";
const model = (reviews: unknown[], summary = prose) => ({ summary, reviews });

test("cart input is strict, bounded, trimmed and expressed as integer cents", () => {
  assert.equal(cartReviewInputSchema.parse({ items: [{ name: "  Lamp  ", originalPriceCents: 1299 }] }).items[0].name, "Lamp");
  for (const input of [
    { items: [] }, { items: Array(11).fill(items[0]) },
    { items, userId: "other-owner" },
    { items: [{ ...items[0], offerId: "browser-choice" }] },
    { items: [{ ...items[0], name: " " }] },
    { items: [{ ...items[0], name: "a".repeat(151) }] },
    ...[0, -1, 19.99, "1000", 10_000_001, Infinity].map((originalPriceCents) => ({ items: [{ name: "Lamp", originalPriceCents }] })),
  ]) assert.equal(cartReviewInputSchema.safeParse(input).success, false);
});

test("eligible feed excludes unknown/starting/expired/stale/nonlower prices and duplicates", () => {
  const valid = offer("valid");
  const candidates = [
    valid, valid, offer("null", { priceCents: null }),
    offer("starting", { priceType: "from" }), offer("unknown", { priceType: "unknown" }),
    offer("unavailable", { status: "unavailable" }),
    offer("expired", { expiresAt: "2026-10-10T11:59:00Z" }),
    offer("stale", { fetchedAt: "2026-10-08T12:00:00Z" }),
    offer("bad-date", { fetchedAt: "invalid" }), offer("bad-expiry", { expiresAt: "invalid" }),
    offer("zero", { priceCents: 0 }), offer("fraction", { priceCents: 99.5 }),
    offer("equal", { priceCents: 10_000 }), offer("higher", { priceCents: 11_000 }),
  ];
  assert.deepEqual(eligibleReviewOffers(items, candidates, now).map((d) => d.id), ["valid"]);
  assert.equal(eligibleReviewOffers(items, Array.from({ length: 80 }, (_, i) => offer(`offer-${i}`)), now).length, 60);
});

test("recommendations must be cheaper for their own item and use authoritative sources", () => {
  const mid = offer("mid"), low = offer("low", { priceCents: 2_000 });
  const result = groundCartReview(items, [mid, low], model([
    { itemIndex: 0, advice: prose, offerIds: ["mid", "low"] },
    { itemIndex: 1, advice: "Use the expensive candidate", offerIds: ["mid", "low"] },
  ]), now);
  assert.deepEqual(result.reviews.map((r) => r.offerIds), [["mid", "low"], ["low"]]);
  assert.equal(result.reviews[0].advice, prose);
  assert.notEqual(result.reviews[1].advice, "Use the expensive candidate");
  assert.deepEqual(result.sources, [mid, low].map((d) => ({
    id: d.id, title: d.title, priceCents: d.priceCents, sourceName: d.sourceName, sourceUrl: d.sourceUrl,
  })));
});

test("IDs outside the supplied subset are dropped along with their dependent prose", () => {
  const result = groundCartReview(items, [offer("known")], model([
    { itemIndex: 0, advice: "Choose the invented offer", offerIds: ["not-supplied"] },
  ], "The invented offer is best"), now);
  assert.deepEqual(result.reviews.map((r) => r.offerIds), [[], []]);
  assert.deepEqual(result.sources, []);
  assert.notEqual(result.reviews[0].advice, "Choose the invented offer");
  assert.notEqual(result.summary, "The invented offer is best");
});

test("duplicate IDs, duplicate item reviews and out-of-range item indexes never multiply recommendations", () => {
  const result = groundCartReview(items, [offer("known")], model([
    { itemIndex: 0, advice: prose, offerIds: ["known", "known"] },
    { itemIndex: 0, advice: "Replacement duplicate", offerIds: [] },
    { itemIndex: 8, advice: prose, offerIds: ["known"] },
  ]), now);
  assert.equal(result.reviews.length, items.length);
  assert.deepEqual(result.reviews.map((r) => r.itemIndex), [0, 1]);
  assert.deepEqual(result.reviews[0].offerIds, ["known"]);
  assert.equal(result.sources.length, 1);
  assert.notEqual(result.reviews[0].advice, "Replacement duplicate");
});

test("model URLs, monetary assertions, operation claims and equivalence claims do not pass through", () => {
  for (const unsafe of [
    "Visit https://invented.example/buy", "Use www.invented.example", "Click [here](javascript:alert(1))",
    "Your final total is $1", "You pay 15 dollars", "Expect 10% cashback",
    "I bought the item", "Your order placed successfully", "I placed your order",
    "The products are identical", "This is an equivalent product", "The same product is guaranteed",
    "<a href='https://evil.example'>Buy</a>",
  ]) {
    const result = groundCartReview([items[0]], [offer("known")], model([
      { itemIndex: 0, advice: unsafe, offerIds: ["known"] },
    ], unsafe), now);
    assert.notEqual(result.reviews[0].advice, unsafe, unsafe);
    assert.notEqual(result.summary, unsafe, unsafe);
    assert.deepEqual(result.reviews[0].offerIds, ["known"]);
    assert.equal(result.sources[0].sourceUrl, "https://www.dealnews.com/known?iref=rss");
  }
});

test("missing item reviews get explicit no-candidate advice, including an empty current feed", () => {
  const result = groundCartReview(items, [], model([]), now);
  assert.deepEqual(result.sources, []);
  assert.equal(result.reviews.length, 2);
  for (const review of result.reviews) {
    assert.deepEqual(review.offerIds, []);
    assert.match(review.advice, /No suitable lower-price candidate/);
  }
});

test("malformed, oversized or extra-field provider output is rejected, never treated as trusted data", () => {
  const valid = { itemIndex: 0, advice: prose, offerIds: ["known"] };
  for (const output of [
    null, { ...model([valid]), sources: [{ sourceUrl: "https://invented.example" }] },
    model([{ ...valid, totalCents: 1 }]), model([{ ...valid, itemIndex: -1 }]),
    model([{ ...valid, itemIndex: 10 }]), model([{ ...valid, itemIndex: 0.5 }]),
    model([{ ...valid, advice: "x".repeat(501) }]),
    model([{ ...valid, offerIds: ["a", "b", "c", "d"] }]),
    model(Array(11).fill(valid)), model([valid], "x".repeat(501)),
  ]) {
    assert.equal(cartReviewModelSchema.safeParse(output).success, false);
    assert.throws(() => groundCartReview(items, [offer("known")], output, now));
  }
});

test("an offer that expires during generation is removed before returning recommendations", () => {
  const expiring = offer("expiring", { expiresAt: "2026-10-10T12:00:01Z" });
  assert.equal(eligibleReviewOffers(items, [expiring], now).length, 1);
  const result = groundCartReview(items, [expiring], model([
    { itemIndex: 0, advice: prose, offerIds: ["expiring"] },
  ]), now + 2_000);
  assert.deepEqual(result.reviews[0].offerIds, []);
  assert.deepEqual(result.sources, []);
});
