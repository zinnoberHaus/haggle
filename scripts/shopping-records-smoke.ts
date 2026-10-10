/**
 * Real HTTP integration checks against a running Haggle build.
 * Run: TEST_BASE_URL=http://localhost:3003 npx tsx scripts/shopping-records-smoke.ts
 * Creates two isolated managed-auth identities and deletes only those identities
 * and their cascading app records in finally. No AI, reset-email, or retailer calls.
 */
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const base = process.env.TEST_BASE_URL || "http://localhost:3003";
assert.ok(
  process.env.DATABASE_URL,
  "DATABASE_URL is required for scoped cleanup",
);
const sql = neon(process.env.DATABASE_URL);
const run = randomBytes(10).toString("hex");
const emails = [0, 1].map(
  (i) => `haggle-records-smoke-${run}-${i}@example.com`,
);
const password = `Haggle-${randomBytes(24).toString("hex")}`;
const userIds: string[] = [];

class Client {
  cookies = new Map<string, string>();
  async call(path: string, method = "GET", data?: unknown, origin = base) {
    const response = await fetch(`${base}${path}`, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Origin: origin,
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const index = pair.indexOf("=");
      const name = pair.slice(0, index),
        value = pair.slice(index + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return { status: response.status, body, text };
  }
}

async function main() {
  const anonymous = new Client(),
    first = new Client(),
    second = new Client();
  for (const path of ["/api/me/purchases", "/api/me/comparisons"]) {
    assert.equal((await anonymous.call(path)).status, 401);
    assert.equal((await anonymous.call(path, "POST", {})).status, 401);
  }
  for (const [index, client] of [first, second].entries()) {
    const signup = await client.call("/api/auth/sign-up/email", "POST", {
      email: emails[index],
      password,
      name: "Shopping records integration test",
    });
    assert.equal(
      signup.status,
      200,
      `Signup ${index}: ${signup.status}; code=${signup.body?.code ?? "none"}`,
    );
    const profile = await client.call("/api/me/profile");
    assert.equal(profile.status, 200);
    assert.equal(profile.body.user.email, emails[index]);
    userIds.push(profile.body.user.id);
  }
  console.log(
    "PASS anonymous denial and two real isolated managed-auth sessions",
  );

  const [offer] = await sql`SELECT id,price_cents,source_url FROM offers
    WHERE status='active' AND fetched_at>now()-interval '48 hours'
      AND (expires_at IS NULL OR expires_at>now()) AND price_cents IS NOT NULL
    ORDER BY published_at DESC LIMIT 1`;
  assert.ok(offer, "A current priced feed offer is required");
  const cart = await first.call("/api/me/cart", "POST", {
    items: [
      {
        name: "Records smoke item",
        originalPriceCents: 20_000,
        offerId: offer.id,
      },
    ],
  });
  assert.equal(cart.status, 201);
  const purchase = {
    cartPlanId: cart.body.id,
    offerId: offer.id,
    productName: `Isolated purchase ${run}`,
    merchant: "Test retailer",
    purchasedOn: new Date().toISOString().slice(0, 10),
    paidTotalCents: 10_000,
    baselineTotalCents: 14_000,
    policyUrl: "https://example.com/price-adjustment-policy",
    adjustmentDeadline: null,
    adjustmentStatus: "draft",
    refundCents: 0,
  };
  const created = await first.call("/api/me/purchases", "POST", purchase);
  assert.equal(created.status, 201);
  const purchaseId = created.body.purchase.id;
  assert.equal(created.body.purchase.reportedSavingsCents, 4_000);
  assert.equal(created.body.purchase.feeCents, 0);
  assert.equal(
    (await first.call("/api/me/purchases")).body.purchases[0].id,
    purchaseId,
  );

  assert.deepEqual((await second.call("/api/me/purchases")).body.purchases, []);
  assert.equal(
    (await second.call("/api/me/purchases", "POST", purchase)).status,
    400,
    "Other account cannot link the first account's plan",
  );
  assert.equal(
    (
      await second.call("/api/me/purchases", "PATCH", {
        id: purchaseId,
        ...purchase,
      })
    ).status,
    404,
  );
  assert.equal(
    (await second.call("/api/me/purchases", "DELETE", { id: purchaseId }))
      .status,
    404,
  );
  assert.equal(
    (await first.call("/api/me/purchases", "DELETE", { id: "forged" })).status,
    400,
  );
  assert.equal(
    (await first.call("/api/me/purchases", "DELETE", { id: randomUUID() }))
      .status,
    404,
  );
  assert.equal(
    (
      await first.call("/api/me/purchases", "POST", {
        ...purchase,
        userId: userIds[1],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await first.call("/api/me/purchases", "POST", {
        ...purchase,
        reportedSavingsCents: 999_999,
        feeCents: 999,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await first.call(
        "/api/me/purchases",
        "PATCH",
        { id: purchaseId, ...purchase },
        "https://evil.example",
      )
    ).status,
    403,
  );
  for (const changes of [
    { adjustmentStatus: "received", refundCents: 0 },
    { adjustmentStatus: "received", refundCents: 10_001 },
    { adjustmentStatus: "submitted", refundCents: 800 },
  ]) {
    assert.equal(
      (
        await first.call("/api/me/purchases", "PATCH", {
          id: purchaseId,
          ...purchase,
          ...changes,
        })
      ).status,
      400,
    );
  }
  const received = {
    ...purchase,
    baselineTotalCents: 15_000,
    adjustmentStatus: "received",
    refundCents: 800,
  };
  const updated = await first.call("/api/me/purchases", "PATCH", {
    id: purchaseId,
    ...received,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.purchase.reportedSavingsCents, 5_000);
  const purchaseList = await first.call("/api/me/purchases");
  assert.equal(purchaseList.body.purchases[0].refundCents, 800);
  assert.deepEqual(purchaseList.body.totals, {
    reportedSavingsCents: 5_000,
    receivedRefundCents: 800,
    feeCents: 0,
    purchaseCount: 1,
  });
  console.log(
    "PASS purchase create/update/reload, received-refund accounting, ownership and plan-link isolation, strict monetary input and CSRF",
  );

  const input = {
    name: `Isolated comparison ${run}`,
    offerId: offer.id,
    itemPriceCents: 10_000,
    couponCents: 1_500,
    couponAlreadyIncluded: false,
    couponCode: "EXAMPLE",
    couponNotes: "An entered assumption for this test",
    couponSourceUrl: "https://example.com/coupon",
    shippingCents: null,
    taxCents: 700,
    cashbackCents: 500,
    cashbackNotes: "Eligibility unconfirmed; reward arrives later",
    cashbackSourceUrl: "https://example.com/cashback",
    cardRewardCents: 200,
    cardRewardNotes: "Eligible card required; reward arrives later",
    cardRewardSourceUrl: "https://example.com/card",
    notes: "User-entered assumptions, not verified retailer terms",
  };
  const comparison = await first.call("/api/me/comparisons", "POST", { input });
  assert.equal(comparison.status, 201);
  const comparisonId = comparison.body.comparison.id;
  assert.deepEqual(comparison.body.comparison.result, {
    additionalCouponCents: 1_500,
    itemAfterCouponCents: 8_500,
    knownSubtotalCents: 9_200,
    unknownCosts: ["shipping"],
    payNowCents: null,
    potentialRewardsCents: 700,
    conditionalNetCents: null,
  });
  assert.equal(comparison.body.comparison.sourceSnapshot.id, offer.id);
  assert.equal(
    comparison.body.comparison.sourceSnapshot.priceCents,
    offer.price_cents,
  );
  assert.equal(
    comparison.body.comparison.sourceSnapshot.sourceUrl,
    offer.source_url,
  );
  assert.equal(
    (await first.call("/api/me/comparisons")).body.comparisons[0].result
      .payNowCents,
    null,
  );
  assert.deepEqual(
    (await second.call("/api/me/comparisons")).body.comparisons,
    [],
  );
  assert.equal(
    (
      await second.call("/api/me/comparisons", "PATCH", {
        id: comparisonId,
        input,
      })
    ).status,
    404,
  );
  assert.equal(
    (await second.call("/api/me/comparisons", "DELETE", { id: comparisonId }))
      .status,
    404,
  );
  assert.equal(
    (
      await first.call("/api/me/comparisons", "POST", {
        input,
        result: { payNowCents: 1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await first.call("/api/me/comparisons", "POST", {
        input,
        userId: userIds[1],
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await first.call("/api/me/comparisons", "POST", {
        input: { ...input, cashbackNotes: "" },
      })
    ).status,
    400,
  );
  assert.equal(
    (await first.call("/api/me/comparisons", "DELETE", { id: "forged" }))
      .status,
    400,
  );
  assert.equal(
    (
      await first.call(
        "/api/me/comparisons",
        "DELETE",
        { id: comparisonId },
        "https://evil.example",
      )
    ).status,
    403,
  );
  const completeInput = {
    ...input,
    couponAlreadyIncluded: true,
    shippingCents: 500,
  };
  const complete = await first.call("/api/me/comparisons", "PATCH", {
    id: comparisonId,
    input: completeInput,
  });
  assert.equal(complete.status, 200);
  assert.deepEqual(complete.body.comparison.result, {
    additionalCouponCents: 0,
    itemAfterCouponCents: 10_000,
    knownSubtotalCents: 11_200,
    unknownCosts: [],
    payNowCents: 11_200,
    potentialRewardsCents: 700,
    conditionalNetCents: 10_500,
  });
  assert.equal(
    (await first.call("/api/me/comparisons")).body.comparisons[0].result
      .conditionalNetCents,
    10_500,
  );
  console.log(
    "PASS comparison persistence, real source snapshot, server recomputation, unknown costs remain null, included coupon not deducted twice, forged results/owners rejected",
  );

  const exported = await first.call("/api/me/export");
  assert.equal(exported.status, 200);
  assert.equal(exported.body.user.id, userIds[0]);
  assert.equal(exported.body.purchases[0].id, purchaseId);
  assert.equal(exported.body.purchases[0].refundCents, 800);
  assert.equal(exported.body.costComparisons[0].id, comparisonId);
  assert.equal(exported.body.costComparisons[0].result.payNowCents, 11_200);
  assert.deepEqual(exported.body.aiUsage, []);
  const otherExport = await second.call("/api/me/export");
  assert.deepEqual(otherExport.body.purchases, []);
  assert.deepEqual(otherExport.body.costComparisons, []);
  assert.deepEqual(otherExport.body.cartPlans, []);
  const ledger = await first.call("/api/me/savings");
  assert.deepEqual(ledger.body, {
    entries: [],
    totalSavedCents: 0,
    totalFeeCents: 0,
  });
  assert.deepEqual(exported.body.savings, ledger.body);
  const savingsPage = await first.call("/savings");
  assert.equal(savingsPage.status, 200);
  for (const expected of [
    purchase.productName,
    "Purchase savings you reported",
    "Refunds you reported receiving",
    "User-reported amounts",
    "Provider-verified history",
  ]) {
    assert.ok(
      savingsPage.text.includes(expected),
      `Savings page must show ${expected}`,
    );
  }
  assert.match(
    savingsPage.text,
    />\$50(?:\.00)?</,
    "Reported purchase savings is displayed",
  );
  assert.match(
    savingsPage.text,
    />\$8(?:\.00)?</,
    "Received refund is displayed separately",
  );
  console.log(
    "PASS complete owner-filtered export and savings page; reported savings/refunds remain separate from an untouched zero provider ledger",
  );

  assert.equal(
    (await first.call("/api/me/purchases", "DELETE", { id: purchaseId }))
      .status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/comparisons", "DELETE", { id: comparisonId }))
      .status,
    200,
  );
  assert.deepEqual((await first.call("/api/me/purchases")).body.purchases, []);
  assert.deepEqual(
    (await first.call("/api/me/comparisons")).body.comparisons,
    [],
  );
  assert.equal(
    (await first.call("/api/me/purchases", "DELETE", { id: purchaseId }))
      .status,
    404,
  );
  assert.equal(
    (await first.call("/api/me/comparisons", "DELETE", { id: comparisonId }))
      .status,
    404,
  );
  console.log("PASS owner deletion persists and repeat deletion returns404");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Shopping records smoke failed",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql`DELETE FROM neon_auth.verification WHERE value IN (SELECT id::text FROM neon_auth."user" WHERE email=ANY(${emails}::text[]))`;
    await sql`DELETE FROM neon_auth."user" WHERE email=ANY(${emails}::text[])`;
    const [remaining] =
      await sql`SELECT count(*)::int AS count FROM neon_auth."user" WHERE email=ANY(${emails}::text[])`;
    assert.equal(remaining.count, 0);
    if (userIds.length) {
      const [data] = await sql`SELECT
      (SELECT count(*) FROM purchases WHERE user_id=ANY(${userIds}::uuid[])) +
      (SELECT count(*) FROM cost_comparisons WHERE user_id=ANY(${userIds}::uuid[])) +
      (SELECT count(*) FROM cart_plans WHERE user_id=ANY(${userIds}::uuid[])) AS count`;
      assert.equal(Number(data.count), 0);
    }
    console.log(
      "PASS cleanup: this run's exact two identities and cascading shopping records removed",
    );
  });
