/** Controlled browser responses only: no AI provider call, account, or database writes. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.TEST_BASE_URL || "http://localhost:3003";
const browser = await chromium.launch({ headless: true });
const findings = [];
const record = (check, data) => {
  findings.push({ check, ...data });
  console.log(JSON.stringify(findings.at(-1)));
};
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "networkidle" });
  const hrefs = await page
    .locator('a[href^="/deals/"]')
    .evaluateAll((nodes) => [
      ...new Set(nodes.map((node) => node.getAttribute("href"))),
    ]);
  let offer = null;
  for (const href of hrefs.slice(0, 8)) {
    await page.goto(base + href, { waitUntil: "networkidle" });
    const price = await page
      .locator(".detail-info .price-line strong")
      .innerText();
    if (!/\$[\d,.]+/.test(price)) continue;
    offer = {
      id: href.split("/").at(-1),
      title: await page.locator(".detail-info h1").innerText(),
    };
    break;
  }
  assert.ok(offer, "a collected offer with a numeric price is needed");
  let mode = "success";
  let calls = 0;
  let releaseOld;
  let heldRequest;
  const held = new Promise((resolve) => {
    heldRequest = resolve;
  });
  let oldCompleted;
  const oldFinished = new Promise((resolve) => {
    oldCompleted = resolve;
  });
  const successfulResponse = (summary) => ({
    summary,
    reviews: [
      {
        itemIndex: 0,
        advice:
          "Controlled browser-test advice: check the model and retailer terms.",
        offerIds: [offer.id, "dn-not-a-known-source"],
      },
    ],
    sources: [],
  });
  await page.route("**/api/cart-review", async (route) => {
    calls += 1;
    const request = route.request().postDataJSON();
    assert.equal(request.items.length, 1);
    assert.equal(typeof request.items[0].originalPriceCents, "number");
    assert.equal(Object.hasOwn(request.items[0], "offerId"), false);
    if (mode === "hold") {
      heldRequest();
      await new Promise((resolve) => {
        releaseOld = resolve;
      });
      try {
        await route.fulfill({
          status: 200,
          json: successfulResponse("Old fixture response must stay hidden"),
        });
      } catch {
        /* The component aborts this intentionally stale browser request. */
      } finally {
        oldCompleted();
      }
      return;
    }
    if (mode === "401")
      return route.fulfill({
        status: 401,
        json: { error: "Sign in to continue." },
      });
    if (mode === "429")
      return route.fulfill({
        status: 429,
        json: {
          error: "You’ve used today’s 10 AI questions. You can keep comparing.",
        },
      });
    return route.fulfill({
      status: 200,
      json: successfulResponse(
        mode === "new"
          ? "New fixture review for the edited list"
          : "Fixture AI review with a semantic alternative",
      ),
    });
  });
  await page.goto(base + "/cart", { waitUntil: "networkidle" });
  await page
    .getByLabel("Product 1", { exact: true })
    .fill("zxq-unmatched-semantic-fixture");
  await page.getByLabel("Your price ($)", { exact: true }).fill("100000");
  await page.getByRole("button", { name: "Find possible savings" }).click();
  assert.equal(
    await page
      .getByLabel("Your choice", { exact: true })
      .locator("option")
      .count(),
    1,
  );
  await page
    .getByRole("button", { name: "Ask AI to review my list", exact: true })
    .click();
  await expect(
    page.getByText("Fixture AI review with a semantic alternative", {
      exact: true,
    }),
  ).toBeVisible();
  const choices = page.getByLabel("Your choice", { exact: true });
  assert.equal(
    await choices.inputValue(),
    "",
    "AI must never select a replacement",
  );
  assert.equal(
    await choices.locator(`option[value="${offer.id}"]`).count(),
    1,
    "AI-grounded offer survives keyword mismatch",
  );
  assert.equal(
    await page.locator('a[href="/deals/dn-not-a-known-source"]').count(),
    0,
  );
  await expect(page.getByText(/Advertised price:/)).toBeVisible();
  await choices.selectOption(offer.id);
  await expect(
    page.getByText("Fixture AI review with a semantic alternative", {
      exact: true,
    }),
  ).toBeVisible();
  record("grounded semantic option", {
    sourceAdded: true,
    unknownSourceHidden: true,
    autoSelection: false,
    choiceChangesPreserveAdvice: true,
  });
  mode = "hold";
  await page
    .getByRole("button", { name: "Review my list again", exact: true })
    .click();
  await held;
  await page.getByRole("button", { name: "Edit my list", exact: true }).click();
  await page
    .getByLabel("Product 1", { exact: true })
    .fill("zxq-edited-semantic-fixture");
  await page.getByLabel("Your price ($)", { exact: true }).fill("99999");
  await page.getByRole("button", { name: "Find possible savings" }).click();
  await expect(
    page.getByText("Fixture AI review with a semantic alternative", {
      exact: true,
    }),
  ).toHaveCount(0);
  assert.equal(
    await page.getByLabel("Your choice", { exact: true }).inputValue(),
    "",
    "editing the item requires a new explicit replacement choice",
  );
  mode = "new";
  await page
    .getByRole("button", { name: "Ask AI to review my list", exact: true })
    .click();
  await expect(
    page.getByText("New fixture review for the edited list", { exact: true }),
  ).toBeVisible();
  releaseOld();
  await oldFinished;
  await expect(
    page.getByText("Old fixture response must stay hidden", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("New fixture review for the edited list", { exact: true }),
  ).toBeVisible();
  assert.equal(
    await page.getByLabel("Your choice", { exact: true }).inputValue(),
    "",
  );
  await page.getByLabel("Your choice", { exact: true }).selectOption(offer.id);
  record("stale response race", {
    editedListClearsAdvice: true,
    latePreviousResponseIgnored: true,
    editedItemRequiresNewExplicitChoice: true,
  });
  await page.screenshot({
    path: "/tmp/haggle-cart-ai-advice-mobile.png",
    fullPage: true,
  });
  mode = "429";
  await page
    .getByRole("button", { name: "Review my list again", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "10 AI questions",
  );
  await expect(
    page.getByRole("button", { name: "Approve & save this plan", exact: true }),
  ).toBeEnabled();
  record("AI quota feedback", {
    status: 429,
    manualApprovalStillAvailable: true,
  });
  mode = "401";
  await page
    .getByRole("button", { name: "Review my list again", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Sign in for AI review", exact: true }),
  ).toBeVisible();
  const callsBeforeRoundtrip = calls;
  // Visit the real public sign-in page, then return without authenticating.
  // This isolates draft persistence from the separately tested managed auth flow.
  await page
    .getByRole("link", { name: "Sign in for AI review", exact: true })
    .click();
  await page.waitForURL("**/sign-in?next=/cart");
  await page.goto(base + "/cart", { waitUntil: "networkidle" });
  await expect(page.getByLabel("Your choice", { exact: true })).toHaveValue(
    offer.id,
  );
  await expect(
    page.getByRole("heading", { name: /zxq-edited-semantic-fixture/ }),
  ).toBeVisible();
  assert.equal(
    calls,
    callsBeforeRoundtrip,
    "returning must not trigger a paid/provider request automatically",
  );
  const draft = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("haggle.cart-draft.v1")),
  );
  assert.equal(draft[0].price, "99999");
  assert.equal(draft[0].offerId, offer.id);
  record("401 handoff", {
    listRestored: true,
    selectionRestored: true,
    priceRestored: true,
    noAutomaticAIRequest: true,
  });
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  assert.equal(layout.documentWidth, 390);
  await page.screenshot({
    path: "/tmp/haggle-cart-ai-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  record("mobile layout and browser errors", { ...layout, errors });
  await fs.writeFile(
    "/tmp/haggle-cart-ai-ui-review.json",
    JSON.stringify(findings, null, 2),
  );
} finally {
  await browser.close();
}
