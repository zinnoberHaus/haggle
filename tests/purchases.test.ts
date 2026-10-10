import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAdjustmentRequest,
  dollarsToCents,
  purchaseInputSchema,
  purchaseUpdateSchema,
  reportedPurchaseAmounts,
  summarizePurchases,
  validatePurchaseReferences,
  type PurchaseInput,
  type ObservedPurchaseOffer,
} from "../src/lib/purchase-values";

const input = (patch: Partial<PurchaseInput> = {}): PurchaseInput => ({
  cartPlanId: null,
  offerId: null,
  productName: "Headphones",
  merchant: "Example store",
  purchasedOn: "2026-01-10",
  paidTotalCents: 9000,
  baselineTotalCents: 10000,
  policyUrl: null,
  adjustmentDeadline: null,
  adjustmentStatus: "draft",
  refundCents: 0,
  ...patch,
});

test("purchase money uses exact cents and rejects rounding or out-of-range input", () => {
  for (const [value, expected] of [
    ["0.29", 29],
    ["1.01", 101],
    ["19.9", 1990],
    [" 20 ", 2000],
    ["1000000.00", 100000000],
  ] as const)
    assert.equal(dollarsToCents(value), expected);
  for (const value of [
    "",
    "NaN",
    "Infinity",
    "-1",
    "1.009",
    "1e3",
    "1000000.01",
    "9007199254740993",
    "1,000",
  ])
    assert.equal(dollarsToCents(value), null, value);
  for (const value of [
    0,
    -1,
    1.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    100000001,
  ])
    assert.equal(
      purchaseInputSchema.safeParse(input({ paidTotalCents: value })).success,
      false,
    );
});

test("reported savings excludes unknown or negative differences and pending refunds", () => {
  assert.deepEqual(reportedPurchaseAmounts(input()), {
    reportedSavingsCents: 1000,
    receivedRefundCents: 0,
    feeCents: 0,
  });
  assert.equal(
    reportedPurchaseAmounts(input({ baselineTotalCents: null }))
      .reportedSavingsCents,
    0,
  );
  assert.equal(
    reportedPurchaseAmounts(input({ baselineTotalCents: 8000 }))
      .reportedSavingsCents,
    0,
  );
  assert.deepEqual(
    summarizePurchases([
      input(),
      input({
        adjustmentStatus: "received",
        refundCents: 1500,
        baselineTotalCents: null,
      }),
    ]),
    {
      reportedSavingsCents: 1000,
      receivedRefundCents: 1500,
      feeCents: 0,
      purchaseCount: 2,
    },
  );
});

test("only received refunds count, and a refund cannot exceed what was paid", () => {
  for (const status of ["draft", "submitted", "rejected"] as const) {
    assert.equal(
      purchaseInputSchema.safeParse(
        input({ adjustmentStatus: status, refundCents: 1 }),
      ).success,
      false,
    );
    assert.equal(
      purchaseInputSchema.safeParse(
        input({ adjustmentStatus: status, refundCents: 0 }),
      ).success,
      true,
    );
  }
  assert.equal(
    purchaseInputSchema.safeParse(
      input({ adjustmentStatus: "received", refundCents: 0 }),
    ).success,
    false,
  );
  assert.equal(
    purchaseInputSchema.safeParse(
      input({ adjustmentStatus: "received", refundCents: 9001 }),
    ).success,
    false,
  );
  assert.equal(
    purchaseInputSchema.safeParse(
      input({ adjustmentStatus: "received", refundCents: 9000 }),
    ).success,
    true,
  );
  const id = "d0b7348b-bb9b-4622-a7bb-af0d855ce2a4";
  // Full replacement edits can correct a mistaken received status without keeping its money.
  assert.equal(
    purchaseUpdateSchema.safeParse({
      id,
      ...input({ adjustmentStatus: "draft", refundCents: 0 }),
    }).success,
    true,
  );
  assert.equal(
    purchaseUpdateSchema.safeParse({ id, adjustmentStatus: "draft" }).success,
    false,
  );
});

test("dates must be real and a deadline cannot precede the purchase", () => {
  for (const date of [
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-1-01",
    "1899-12-31",
    "2999-01-01",
  ])
    assert.equal(
      purchaseInputSchema.safeParse(input({ purchasedOn: date })).success,
      false,
      date,
    );
  assert.equal(
    purchaseInputSchema.safeParse(input({ purchasedOn: "2024-02-29" })).success,
    true,
  );
  assert.equal(
    purchaseInputSchema.safeParse(input({ adjustmentDeadline: "2026-01-09" }))
      .success,
    false,
  );
  assert.equal(
    purchaseInputSchema.safeParse(input({ adjustmentDeadline: "2026-01-10" }))
      .success,
    true,
  );
});

test("the API schema rejects forged identity, fees, savings and unsafe policy URLs", () => {
  for (const patch of [
    { userId: "another-account" },
    { reportedSavingsCents: 999999 },
    { feeCents: 1 },
    { id: "forged" },
  ])
    assert.equal(
      purchaseInputSchema.safeParse({ ...input(), ...patch }).success,
      false,
    );
  for (const policyUrl of [
    "javascript:alert(1)",
    "data:text/html,test",
    "http://example.com/policy",
    "https://user:password@example.com/policy",
    "//example.com/policy",
  ])
    assert.equal(
      purchaseInputSchema.safeParse(input({ policyUrl })).success,
      false,
    );
  assert.equal(
    purchaseInputSchema.safeParse(
      input({ policyUrl: "https://example.com/policy?ref=receipt" }),
    ).success,
    true,
  );
  assert.equal(
    purchaseInputSchema.parse(
      input({ policyUrl: "HTTPS://EXAMPLE.COM/policy" }),
    ).policyUrl,
    "https://example.com/policy",
  );
});

test("plan references require the authenticated owner and offer references must exist", async () => {
  const withPlan = input({
    cartPlanId: "d0b7348b-bb9b-4622-a7bb-af0d855ce2a4",
    offerId: "dn-1234567890abcdef12345678",
  });
  assert.equal(
    await validatePurchaseReferences(withPlan, "owner-a", {
      getPlanOwner: async () => "owner-a",
      offerExists: async () => true,
    }),
    null,
  );
  for (const owner of ["owner-b", null])
    assert.match(
      (await validatePurchaseReferences(withPlan, "owner-a", {
        getPlanOwner: async () => owner,
        offerExists: async () => true,
      }))!,
      /not available/,
    );
  assert.match(
    (await validatePurchaseReferences(withPlan, "owner-a", {
      getPlanOwner: async () => "owner-a",
      offerExists: async () => false,
    }))!,
    /Choose an offer/,
  );
  assert.equal(
    await validatePurchaseReferences(input(), "owner-a", {
      getPlanOwner: async () => {
        throw new Error("unexpected plan lookup");
      },
      offerExists: async () => {
        throw new Error("unexpected offer lookup");
      },
    }),
    null,
  );
});

test("request draft preserves source and uncertainty instead of asserting a refund", () => {
  const offer: ObservedPurchaseOffer = {
    id: "dn-1234567890abcdef12345678",
    title: "Headphones from $70",
    merchant: "Example store",
    priceCents: 7000,
    priceType: "from",
    sourceName: "DealNews",
    sourceUrl: "https://www.dealnews.com/example.html?iref=rss",
    fetchedAt: "2026-01-15T00:00:00.000Z",
    status: "unavailable",
  };
  const draft = buildAdjustmentRequest(
    input({
      policyUrl: "https://example.com/policy",
      adjustmentDeadline: "2026-02-01",
    }),
    offer,
    "Alex",
  );
  assert.match(draft, /recorded paid total is \$90\.00/);
  assert.match(draft, /starting item price: \$70\.00/);
  assert.match(draft, /may no longer be available/);
  assert.ok(draft.includes(offer.sourceUrl));
  assert.match(draft, /not treating it as a confirmed refund amount/);
  assert.match(draft, /\[add your order number before sending\]/);
  assert.match(draft, /please confirm/);
  assert.match(draft, /Alex$/);
  const noOffer = buildAdjustmentRequest(input(), null, "");
  assert.match(noOffer, /\[your name\]/);
  assert.equal(noOffer.includes("Publisher’s"), false);
});
