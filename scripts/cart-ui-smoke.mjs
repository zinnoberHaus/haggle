/**
 * Focused browser regressions against a running production build.
 * Run: TEST_BASE_URL=http://localhost:3003 node scripts/cart-ui-smoke.mjs
 *
 * The cart check uses the actual anonymous API (401), with no credentials or
 * account creation. The saved-state race uses browser-only intercepted GET/POST
 * responses; it does not authenticate, write backend data, or test authorization.
 */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = process.env.TEST_BASE_URL || 'http://localhost:3003';
const browser = await chromium.launch({ headless: true });
async function within(promise, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 20_000);
    })]);
  } finally { clearTimeout(timer); }
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
  await page.getByLabel('Product 1', { exact: true }).fill('Electronics');
  await page.getByLabel('Your price ($)', { exact: true }).fill('500');
  await page.getByRole('button', { name: 'Find possible savings' }).click();
  const choice = page.getByLabel('Your choice', { exact: true });
  const offerId = await choice.locator('option').nth(1).getAttribute('value');
  assert.ok(offerId, 'The current feed must contain a priced Electronics offer below $500');
  await choice.selectOption(offerId);
  const denied = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/me/cart' && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Approve & save this plan', exact: true }).click();
  assert.equal((await denied).status(), 401, 'Real anonymous cart approval is denied');
  const signIn = page.getByRole('alert').getByRole('link', { name: 'Sign in', exact: true });
  await signIn.click();
  await page.waitForURL((url) => url.pathname === '/sign-in');
  assert.equal(new URL(page.url()).searchParams.get('next'), '/cart');
  // Return in the same tab without creating a user or bypassing authentication.
  await page.goto(`${base}/cart`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'A few possibilities. You decide.', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Your choice', { exact: true }).inputValue(), offerId);
  await page.getByRole('button', { name: 'Edit my list', exact: true }).click();
  assert.equal(await page.getByLabel('Product 1', { exact: true }).inputValue(), 'Electronics');
  assert.equal(await page.getByLabel('Your price ($)', { exact: true }).inputValue(), '500');
  console.log('PASS real anonymous approval 401 -> sign-in link -> same-tab return retains list, price and selected offer');
  await context.close();

  const raceContext = await browser.newContext();
  const racePage = await raceContext.newPage();
  racePage.setDefaultTimeout(20_000);
  let releaseRead;
  let signalFirstRead;
  let signalReconciled;
  let signalStaleHandled;
  let readCount = 0;
  let savedId;
  const holdRead = new Promise((resolve) => { releaseRead = resolve; });
  const firstRead = new Promise((resolve) => { signalFirstRead = resolve; });
  const reconciled = new Promise((resolve) => { signalReconciled = resolve; });
  const staleHandled = new Promise((resolve) => { signalStaleHandled = resolve; });
  await racePage.route('**/api/me/saved', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      savedId = request.postDataJSON().offerId;
      await route.fulfill({ json: { saved: { offerId: savedId, targetPriceCents: null } } });
      return;
    }
    if (request.method() === 'GET') {
      readCount += 1;
      if (readCount === 1) {
        signalFirstRead();
        await holdRead;
        // The stale snapshot predates the save. Cancellation is also a valid
        // defense, so a fulfillment failure after AbortController is expected.
        await route.fulfill({ json: { saved: [] } }).catch(() => {});
        signalStaleHandled();
      } else {
        await route.fulfill({ json: { saved: savedId ? [{ offerId: savedId, targetPriceCents: null }] : [] } });
        signalReconciled();
      }
      return;
    }
    throw new Error(`Unexpected saved API method in mock: ${request.method()}`);
  });
  await racePage.goto(base, { waitUntil: 'domcontentloaded' });
  await within(firstRead, 'initial saved read');
  const saveButton = racePage.locator('.save-control button').first();
  await saveButton.click();
  await within(reconciled, 'saved-state reconciliation');
  await racePage.waitForFunction(() => document.querySelector('.save-control button')?.getAttribute('aria-pressed') === 'true');
  releaseRead();
  await within(staleHandled, 'stale response settlement');
  // Allow the fulfilled stale response and React paint to settle.
  await racePage.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await saveButton.getAttribute('aria-pressed'), 'true');
  assert.match(await saveButton.innerText(), /Saved/);
  assert.ok(readCount >= 2, 'A fresh read reconciles the successful toggle');
  console.log('PASS mocked successful save survives delayed stale GET; fresh reconciliation preserves saved state');
  await raceContext.close();
} finally {
  await browser.close();
}
