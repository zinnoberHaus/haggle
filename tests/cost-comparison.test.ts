import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_COST_CENTS,
  calculateCost,
  costInputSchema,
  emptyCostInput,
  offerWarnings,
  parseDollarInput,
  type CostInput,
  type OfferSnapshot,
} from "../src/lib/cost-comparison";

const input = (changes: Partial<CostInput> = {}): CostInput => ({
  ...emptyCostInput(),
  itemPriceCents: 10000,
  shippingCents: 500,
  taxCents: 800,
  ...changes,
});

test("dollar input uses exact cents and rejects coercions, precision and range errors", () => {
  assert.equal(parseDollarInput("19.99"), 1999);
  assert.equal(parseDollarInput("0.29"), 29);
  assert.equal(parseDollarInput(" 5.1 "), 510);
  assert.equal(parseDollarInput("100000.00"), MAX_COST_CENTS);
  assert.equal(parseDollarInput("", true), null);
  assert.equal(parseDollarInput("0", true), 0);
  for (const value of [
    "",
    "-1",
    "1e2",
    "0x10",
    "1.001",
    "$10",
    "1,000",
    "NaN",
    "Infinity",
    "100000.01",
    ".5",
    "+1",
  ]) {
    assert.throws(() => parseDollarInput(value), Error, value);
  }
});

test("pay now includes only additional coupon, shipping and tax; rewards are conditional", () => {
  const result = calculateCost(
    input({
      couponCents: 1000,
      couponAlreadyIncluded: false,
      cashbackCents: 500,
      cashbackNotes:
        "Eligible purchase via portal; payout after return window.",
      cashbackSourceUrl: "https://example.com/cashback",
      cardRewardCents: 200,
      cardRewardNotes: "Eligible card with no category cap reached.",
      cardRewardSourceUrl: "https://example.com/card",
    }),
  );
  assert.equal(result.payNowCents, 10300);
  assert.equal(result.potentialRewardsCents, 700);
  assert.equal(result.conditionalNetCents, 9600);
  assert.equal(result.itemAfterCouponCents, 9000);
});

test("a coupon included in the advertised price is never subtracted twice", () => {
  const result = calculateCost(
    input({ couponCents: 2000, couponAlreadyIncluded: true }),
  );
  assert.equal(result.additionalCouponCents, 0);
  assert.equal(result.itemAfterCouponCents, 10000);
  assert.equal(result.payNowCents, 11300);
  assert.equal(emptyCostInput().couponAlreadyIncluded, true);
});

test("unknown shipping or tax leaves both final totals unknown; explicit zero stays known", () => {
  for (const changes of [
    { shippingCents: null },
    { taxCents: null },
    { shippingCents: null, taxCents: null },
  ]) {
    const result = calculateCost(input(changes));
    assert.equal(result.payNowCents, null);
    assert.equal(result.conditionalNetCents, null);
    assert.ok(result.unknownCosts.length > 0);
  }
  assert.equal(
    calculateCost(input({ shippingCents: null, taxCents: 800 }))
      .knownSubtotalCents,
    10800,
  );
  const zero = calculateCost(input({ shippingCents: 0, taxCents: 0 }));
  assert.equal(zero.payNowCents, 10000);
  assert.deepEqual(zero.unknownCosts, []);
});

test("rejects impossible discounts, overlarge totals, and rewards exceeding known payment", () => {
  assert.throws(() =>
    calculateCost(input({ couponCents: 10001, couponAlreadyIncluded: false })),
  );
  assert.throws(() => calculateCost(input({ itemPriceCents: MAX_COST_CENTS })));
  assert.throws(() =>
    calculateCost(
      input({
        cashbackCents: 12000,
        cashbackNotes: "Manual terms",
        cashbackSourceUrl: "https://example.com",
      }),
    ),
  );
  assert.throws(() =>
    calculateCost(
      input({
        shippingCents: null,
        taxCents: null,
        cashbackCents: 10001,
        cashbackNotes: "Manual terms",
        cashbackSourceUrl: "https://example.com",
      }),
    ),
  );
  const noNegative = calculateCost(
    input({
      itemPriceCents: 100,
      couponCents: 100,
      couponAlreadyIncluded: false,
      shippingCents: 0,
      taxCents: 0,
    }),
  );
  assert.equal(noNegative.conditionalNetCents, 0);
});

test("manual rewards require eligibility notes and safe source URLs", () => {
  for (const changes of [
    { cashbackCents: 100 },
    { cardRewardCents: 100, cardRewardNotes: "Terms" },
    {
      cashbackCents: 100,
      cashbackNotes: "Terms",
      cashbackSourceUrl: "javascript:alert(1)",
    },
    {
      cashbackCents: 100,
      cashbackNotes: "Terms",
      cashbackSourceUrl: "https://user:password@example.com",
    },
  ])
    assert.equal(costInputSchema.safeParse(input(changes)).success, false);
  assert.equal(
    costInputSchema.safeParse(
      input({
        cashbackCents: 100,
        cashbackNotes: "Terms",
        cashbackSourceUrl: "https://example.com/terms?ref=original",
      }),
    ).success,
    true,
  );
});

test("API input rejects submitted totals, owner IDs, fractional cents and unknown fields", () => {
  for (const value of [
    { ...input(), payNowCents: 1 },
    { ...input(), userId: "other-owner" },
    input({ itemPriceCents: 19.99 }),
    input({ shippingCents: -1 }),
    input({ itemPriceCents: Number.MAX_SAFE_INTEGER }),
    input({ offerId: "unknown-product" }),
  ])
    assert.equal(costInputSchema.safeParse(value).success, false);
});

test("changed, starting and stale source prices warn without overriding entered amounts", () => {
  const source: OfferSnapshot = {
    id: "dn-123456789012345678901234",
    title: "Source item",
    priceCents: 9900,
    priceType: "from",
    status: "unavailable",
    fetchedAt: "2026-10-10T00:00:00Z",
    sourceUrl: "https://www.dealnews.com/offer?iref=rss",
    sourceName: "DealNews",
  };
  const entered = input({ offerId: source.id, itemPriceCents: 10000 });
  const warnings = offerWarnings(entered, source);
  assert.equal(warnings.length, 3);
  assert.equal(entered.itemPriceCents, 10000);
  assert.equal(calculateCost(entered).payNowCents, 11300);
  assert.equal(emptyCostInput(source).itemPriceCents, 9900);
  assert.match(offerWarnings(entered, null)[0], /retained/);
});
