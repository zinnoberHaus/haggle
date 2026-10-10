/** Requires an owned Haggle server and database. Removes its isolated identity in finally. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const base = process.env.TEST_BASE_URL || "http://localhost:3003";
const sql = neon(process.env.DATABASE_URL);
const email = `haggle-purchases-ui-${randomBytes(8).toString("hex")}@example.com`;
const password = `Haggle-${randomBytes(24).toString("hex")}`;
const browser = await chromium.launch({ headless: true });
const findings = [];
const errors = [];
const record = (check, result) => {
  findings.push({ check, ...result });
  console.log(JSON.stringify(findings.at(-1)));
};
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
try {
  const signup = await context.request.post(`${base}/api/auth/sign-up/email`, {
    headers: { Origin: base },
    data: { email, password, name: "Purchase flow check" },
  });
  assert.equal(signup.status(), 200, "isolated test signup");
  const offers =
    await sql`SELECT id,title FROM offers WHERE status='active' AND price_cents IS NOT NULL ORDER BY fetched_at DESC LIMIT 1`;
  assert.equal(offers.length, 1);
  const planResponse = await context.request.post(`${base}/api/me/cart`, {
    headers: { Origin: base },
    data: {
      items: [
        {
          name: "Purchase flow check",
          originalPriceCents: 10000,
          offerId: offers[0].id,
        },
      ],
    },
  });
  assert.equal(planResponse.status(), 201);
  const plan = await planResponse.json();
  await page.goto(`${base}/purchases?plan=${plan.id}`, {
    waitUntil: "networkidle",
  });
  assert.equal(
    await page
      .getByLabel("Actual paid total ($)", { exact: true })
      .inputValue(),
    "",
    "never prefill a planned amount as paid",
  );
  assert.equal(
    await page
      .getByLabel("Comparable total before savings ($, optional)")
      .inputValue(),
    "100.00",
  );
  assert.equal(
    await page.getByLabel("Product name", { exact: true }).inputValue(),
    offers[0].title.slice(0, 150),
  );
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Purchase flow check");
  await page.getByLabel("Store you bought from").fill("Test receipt store");
  await page.getByLabel("Purchase date", { exact: true }).fill("2026-01-10");
  await page.getByLabel("Actual paid total ($)", { exact: true }).fill("90.00");
  await page
    .getByLabel("Retailer policy link")
    .fill("https://example.com/price-policy");
  await page
    .getByLabel("Deadline from the policy (optional)")
    .fill("2026-01-24");
  const createdResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/me/purchases") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Record my purchase", exact: true })
    .click();
  const created = await createdResponse;
  assert.equal(created.status(), 201);
  const { purchase } = await created.json();
  assert.equal(purchase.reportedSavingsCents, 1000);
  assert.equal(purchase.refundCents, 0);
  assert.equal(purchase.feeCents, 0);
  assert.equal(purchase.cartPlanId, plan.id);
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Purchase flow check",
      exact: true,
    }),
  });
  await card.waitFor();
  record("record receipt from owned plan", {
    status: created.status(),
    reportedSavingsCents: purchase.reportedSavingsCents,
    feeCents: purchase.feeCents,
  });
  await card.getByRole("button", { name: "Edit purchase & status" }).click();
  await card.getByLabel("Your request status").selectOption("received");
  await card.getByLabel("Refund actually received ($)").fill("5.00");
  const editedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/me/purchases") && r.request().method() === "PATCH",
  );
  await card.getByRole("button", { name: "Save changes", exact: true }).click();
  const edited = await editedResponse;
  assert.equal(edited.status(), 200);
  const editedPurchase = (await edited.json()).purchase;
  assert.equal(editedPurchase.refundCents, 500);
  assert.equal(editedPurchase.adjustmentStatus, "received");
  await card
    .getByText("Prepare a price-adjustment request", { exact: true })
    .click();
  const downloadEvent = page.waitForEvent("download");
  await card
    .getByRole("button", { name: "Download draft", exact: true })
    .click();
  const download = await downloadEvent;
  const draft = await fs.readFile(await download.path(), "utf8");
  assert.match(draft, /recorded paid total is \$90\.00/);
  assert.match(draft, /not treating it as a confirmed refund amount/);
  assert.match(draft, /\[add your order number before sending\]/);
  assert.match(draft, /https:\/\/example.com\/price-policy/);
  record("refund edit and draft download", {
    editStatus: edited.status(),
    refundCents: editedPurchase.refundCents,
    downloadName: download.suggestedFilename(),
    draftHasEligibilityCaution: true,
  });
  await page.screenshot({
    path: "/tmp/haggle-purchases-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/haggle-purchases-mobile.png",
    fullPage: true,
  });
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(layout.documentWidth, 390);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/haggle-purchase-record-mobile.png" });
  record("purchase mobile layout", layout);
  await page.goto(`${base}/savings`, { waitUntil: "networkidle" });
  const purchaseSavings = page.locator(".panel").filter({
    has: page.getByText("Purchase savings you reported", { exact: true }),
  });
  const refundSavings = page.locator(".panel").filter({
    has: page.getByText("Refunds you reported receiving", { exact: true }),
  });
  assert.equal(
    await purchaseSavings.locator(".savings-number").innerText(),
    "$10",
  );
  assert.equal(
    await refundSavings.locator(".savings-number").innerText(),
    "$5",
  );
  await page.screenshot({
    path: "/tmp/haggle-purchase-savings-mobile.png",
    fullPage: true,
  });
  const exportedResponse = await context.request.get(`${base}/api/me/export`);
  assert.equal(exportedResponse.status(), 200);
  const exported = await exportedResponse.json();
  const exportedPurchase = exported.purchases.find(
    (item) => item.id === purchase.id,
  );
  assert.equal(exportedPurchase.refundCents, 500);
  assert.equal(exportedPurchase.reportedSavingsCents, 1000);
  assert.equal(
    exported.savings.totalSavedCents,
    0,
    "manual records cannot enter verified ledger",
  );
  record("savings and export", {
    reportedSavings: "$10",
    receivedRefund: "$5",
    verifiedSavingsCents: exported.savings.totalSavedCents,
    exportStatus: exportedResponse.status(),
  });
  await page.goto(`${base}/purchases`, { waitUntil: "networkidle" });
  const deleteCard = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Purchase flow check",
      exact: true,
    }),
  });
  await deleteCard
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  const deletedResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/me/purchases") &&
      r.request().method() === "DELETE",
  );
  await deleteCard
    .getByRole("button", { name: "Delete this record", exact: true })
    .click();
  assert.equal((await deletedResponse).status(), 200);
  const remaining = await (
    await context.request.get(`${base}/api/me/purchases`)
  ).json();
  assert.equal(remaining.purchases.length, 0);
  assert.equal(remaining.totals.reportedSavingsCents, 0);
  assert.equal(remaining.totals.receivedRefundCents, 0);
  record("delete receipt", {
    remaining: 0,
    reportedSavingsCents: 0,
    receivedRefundCents: 0,
  });
  assert.deepEqual(errors, []);
  record("browser errors", { errors });
  await fs.writeFile(
    "/tmp/haggle-purchases-ui-review.json",
    JSON.stringify(findings, null, 2),
  );
} finally {
  await browser.close();
  await sql`DELETE FROM neon_auth.verification WHERE value IN (SELECT id::text FROM neon_auth."user" WHERE email = ${email})`;
  await sql`DELETE FROM neon_auth."user" WHERE email = ${email}`;
  console.log("Removed this run’s isolated purchase-test identity and data");
}
