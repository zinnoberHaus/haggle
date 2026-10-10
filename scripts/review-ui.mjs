import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const base = process.env.TEST_BASE_URL || "http://localhost:3002";
const browser = await chromium.launch({ headless: true });
const findings = [];
const errors = [];
const links = new Set();
function record(check, data) {
  findings.push({ check, ...data });
  console.log(JSON.stringify(findings.at(-1)));
}
async function inspect(page, path) {
  const response = await page.goto(base + path, { waitUntil: "networkidle" });
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    h1: document.querySelector("h1")?.textContent,
    duplicateIds: [
      ...new Set(
        [...document.querySelectorAll("[id]")]
          .map((e) => e.id)
          .filter((id, index, all) => all.indexOf(id) !== index),
      ),
    ],
  }));
  for (const href of await page
    .locator('a[href^="/"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))))
    links.add(href);
  record(path, { status: response?.status(), ...layout });
}
try {
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await desktop.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await inspect(page, "/");
  await page.screenshot({ path: "/tmp/haggle-desktop.png", fullPage: true });
  const feedCount = await page.locator("#feed article").count();
  const more = page.getByRole("button", { name: "Show more good finds" });
  if (await more.count()) {
    await more.click();
    record("feed pagination", {
      before: feedCount,
      after: await page.locator("#feed article").count(),
    });
  }
  const firstDeal = await page
    .locator('a[href^="/deals/"]')
    .first()
    .getAttribute("href");
  await inspect(page, firstDeal);
  const saveResponse = page.waitForResponse(
    (r) => r.url().endsWith("/api/me/saved") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).first().click();
  record("anonymous save", { apiStatus: (await saveResponse).status() });
  await page.waitForURL(/\/sign-in\?/);
  record("anonymous save return path", {
    path: new URL(page.url()).pathname,
    next: new URL(page.url()).searchParams.get("next"),
  });
  await inspect(page, "/guides");
  const guideLinks = await page
    .locator('main a[href^="/guides/"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  for (const link of guideLinks) await inspect(page, link);
  for (const path of [
    "/coupons",
    "/saved",
    "/cart",
    "/pricing",
    "/extension",
    "/privacy",
    "/sign-in",
    "/sign-up",
    "/reset-password",
  ])
    await inspect(page, path);
  await inspect(page, "/pricing");
  const slider = page.locator('input[type="range"]');
  await slider.focus();
  await slider.press("End");
  record("fee cap", {
    rangeValue: await slider.inputValue(),
    announced: await page.locator('[aria-live="polite"]').textContent(),
  });
  await slider.press("Home");
  record("no savings fee", {
    rangeValue: await slider.inputValue(),
    announced: await page.locator('[aria-live="polite"]').textContent(),
  });
  await inspect(page, "/cart");
  await page
    .getByLabel("Product 1", { exact: true })
    .fill("wireless headphones");
  await page.getByLabel("Your price ($)", { exact: true }).fill("300");
  await page.getByRole("button", { name: "Find possible savings" }).click();
  record("cart compare", {
    choices: await page.locator("select option").count(),
    notice: await page
      .getByText("Estimate only.", { exact: false })
      .textContent(),
  });
  await page.getByRole("button", { name: "Approve & save this plan" }).click();
  await page.getByRole("alert").waitFor();
  record("anonymous cart save", {
    error: await page.getByRole("alert").textContent(),
  });
  await inspect(page, "/ask?q=under%20%2425");
  record("budget search", {
    resultCount: await page.locator("main article").count(),
    firstTitle: await page
      .locator("main article h2")
      .first()
      .textContent()
      .catch(() => null),
  });
  await page.getByRole("button", { name: "Ask Haggle", exact: true }).click();
  await page.getByRole("link", { name: "Sign in for free AI help" }).waitFor();
  record("anonymous AI", { signInShown: true });
  for (const href of [...links].filter(
    (href) =>
      !href.startsWith("/deals/") &&
      !href.startsWith("/?") &&
      !href.startsWith("/ask?") &&
      !href.startsWith("/sign-in?") &&
      !href.startsWith("/sign-up?"),
  )) {
    const response = await desktop.request.get(base + href);
    if (response.status() >= 400)
      record("broken internal link", { href, status: response.status() });
  }
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const mobilePage = await mobile.newPage();
  await inspect(mobilePage, "/");
  await mobilePage.screenshot({
    path: "/tmp/haggle-mobile.png",
    fullPage: true,
  });
  for (const path of [
    "/cart",
    "/pricing",
    "/guides/compare-the-final-price",
    "/sign-up",
    firstDeal,
  ])
    await inspect(mobilePage, path);
  record("page errors", { errors });
  await fs.writeFile(
    "/tmp/haggle-ui-review.json",
    JSON.stringify(findings, null, 2),
  );
} finally {
  await browser.close();
}
