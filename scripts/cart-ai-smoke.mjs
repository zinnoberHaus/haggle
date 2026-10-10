/**
 * One real AI cart review through the browser, with isolated managed identity.
 * TEST_BASE_URL=https://haggle-blue.vercel.app node scripts/cart-ai-smoke.mjs
 * Requires the server and .env.local to use the same owned Haggle database.
 * Quota-denial checks use this test identity only; no additional model calls.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
const base = process.env.TEST_BASE_URL || "http://localhost:3003";
const sql = neon(process.env.DATABASE_URL);
const email = `haggle-cart-ai-${randomBytes(10).toString("hex")}@example.com`;
const password = `Haggle-${randomBytes(24).toString("hex")}`;
const browser = await chromium.launch({ headless: true });
let userId;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const currentOffers = await sql`SELECT id,title,price_cents,price_type,source_url,source_name
    FROM offers WHERE status='active' AND fetched_at>now()-interval '48 hours'
    AND (expires_at IS NULL OR expires_at>now())
    ORDER BY published_at DESC,id ASC LIMIT 250`;
  const offer = currentOffers.slice(0, 60).find((item) => item.price_type === "exact" && item.price_cents > 0 && item.price_cents < 9_990_000);
  assert.ok(offer, "An exact-priced current offer is needed for grounded review");
  const originalPriceCents = Number(offer.price_cents) + 10_000;
  const name = offer.title.slice(0, 150);
  const input = { items: [{ name, originalPriceCents }] };
  const post = (path, data, origin = base) => context.request.post(`${base}${path}`, { headers: { Origin: origin }, data });
  assert.equal((await post("/api/cart-review", input)).status(), 401);
  assert.equal((await post("/api/cart-review", input, "https://evil.example")).status(), 403);
  const signup = await post("/api/auth/sign-up/email", { email, password, name: "Cart AI flow check" });
  assert.equal(signup.status(), 200, "real managed signup");
  const profileResponse = await context.request.get(`${base}/api/me/profile`);
  assert.equal(profileResponse.status(), 200);
  const profile = await profileResponse.json();
  userId = profile.user.id;
  assert.equal(profile.user.email, email);
  for (const invalid of [
    { ...input, userId },
    { items: [] },
    { items: [{ ...input.items[0], originalPriceCents: -1 }] },
    { items: [{ ...input.items[0], offerIds: [offer.id] }] },
  ]) assert.equal((await post("/api/cart-review", invalid)).status(), 400);
  assert.equal((await sql`SELECT requests FROM ai_usage WHERE user_id=${userId}`).length, 0, "invalid requests consume no quota");
  console.log("PASS authentication, same-origin enforcement, strict input and no quota for invalid input");

  await page.goto(`${base}/cart`, { waitUntil: "networkidle" });
  await page.getByLabel("Product 1", { exact: true }).fill(name);
  await page.getByLabel("Your price ($)", { exact: true }).fill((originalPriceCents / 100).toFixed(2));
  await page.getByRole("button", { name: "Find possible savings", exact: true }).click();
  const choice = page.getByLabel("Your choice", { exact: true });
  assert.equal(await choice.inputValue(), "");
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/cart-review" && response.request().method() === "POST", { timeout: 60_000 });
  await page.getByRole("button", { name: "Ask AI to review my list", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, "one real Gateway review succeeds");
  const review = await response.json();
  assert.ok(review.summary.trim());
  assert.equal(review.reviews.length, 1);
  assert.equal(review.reviews[0].itemIndex, 0);
  assert.ok(review.reviews[0].advice.trim());
  assert.ok(review.reviews[0].offerIds.length > 0, "exact current product with higher baseline should have a source suggestion");
  for (const id of review.reviews[0].offerIds) {
    const source = review.sources.find((candidate) => candidate.id === id);
    const actual = currentOffers.find((candidate) => candidate.id === id);
    assert.ok(source && actual, "suggestion has a real current source");
    assert.equal(actual.price_type, "exact");
    assert.equal(source.priceCents, actual.price_cents);
    assert.ok(source.priceCents < originalPriceCents);
    assert.equal(source.sourceUrl, actual.source_url);
    assert.equal(source.title, actual.title);
    assert.equal(source.sourceName, actual.source_name);
    await page.locator(`a[href="/deals/${id}"]`).first().waitFor();
  }
  await page.getByText(review.summary, { exact: true }).waitFor();
  assert.equal(await choice.inputValue(), "", "AI does not choose alternatives");
  assert.equal((await sql`SELECT count(*)::int AS count FROM cart_plans WHERE user_id=${userId}`)[0].count, 0, "AI review does not approve a plan");
  const [usage] = await sql`SELECT requests FROM ai_usage WHERE user_id=${userId} AND day=(now() AT TIME ZONE 'UTC')::date`;
  assert.equal(usage.requests, 1);
  console.log(`PASS real AI review with ${review.sources.length} checked sources, one quota use, unchanged choices and no plan write`);
  await page.screenshot({ path: "/tmp/haggle-cart-ai-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.screenshot({ path: "/tmp/haggle-cart-ai-mobile.png", fullPage: true });
  await choice.selectOption(review.reviews[0].offerIds[0]);
  await page.getByText(review.summary, { exact: true }).waitFor();
  await page.getByRole("button", { name: "Edit my list", exact: true }).click();
  await page.getByLabel("Your price ($)", { exact: true }).fill(((originalPriceCents + 100) / 100).toFixed(2));
  await page.getByRole("button", { name: "Find possible savings", exact: true }).click();
  assert.equal(await page.getByText(review.summary, { exact: true }).count(), 0, "changed baseline clears outdated review");
  assert.equal(await page.getByLabel("Your choice", { exact: true }).inputValue(), "", "changed baseline requires renewed alternative selection");
  console.log("PASS explicit choice, stale advice removal, desktop/mobile rendering");

  await sql`UPDATE ai_usage SET requests=10 WHERE user_id=${userId} AND day=(now() AT TIME ZONE 'UTC')::date`;
  assert.equal((await post("/api/cart-review", input)).status(), 429);
  assert.equal((await post("/api/ask", { query: "Compare this product" })).status(), 429);
  assert.equal((await sql`SELECT requests FROM ai_usage WHERE user_id=${userId} AND day=(now() AT TIME ZONE 'UTC')::date`)[0].requests, 10);
  assert.deepEqual(errors, []);
  console.log("PASS shared Ask/cart daily cap; rejected requests make no additional provider call; no browser errors");
} finally {
  await browser.close();
  await sql`DELETE FROM neon_auth.verification WHERE value IN (SELECT id::text FROM neon_auth."user" WHERE email=${email})`;
  await sql`DELETE FROM neon_auth."user" WHERE email=${email}`;
  assert.equal((await sql`SELECT count(*)::int AS count FROM neon_auth."user" WHERE email=${email}`)[0].count, 0);
  if (userId) assert.equal((await sql`SELECT count(*)::int AS count FROM ai_usage WHERE user_id=${userId}`)[0].count, 0);
  console.log("PASS exact test identity and cascading quota cleanup");
}
