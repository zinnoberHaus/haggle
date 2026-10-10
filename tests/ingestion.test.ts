import assert from "node:assert/strict";
import test from "node:test";
import {
  categoryGroup,
  descriptionFromHtml,
  fetchDealNewsFeed,
  ingestDeals,
  ingestionRunId,
  MAX_FEED_BYTES,
  parseDealNewsFeed,
  parsePriceCents,
} from "../src/lib/ingestion";
import { GET } from "../src/app/api/cron/ingest/route";

const date = "2026-10-10T18:45:00.000Z";
const item = (overrides = "", guid = "offer-1") => `<item>
  <title>Desk lamp for $20 + free shipping w/ Prime</title>
  <link>https://www.dealnews.com/lamp.html?iref=rss&amp;x=2</link><guid>${guid}</guid>
  <pubDate>Sat, 10 Oct 2026 14:43:39 -0400</pubDate>
  <description><![CDATA[<img src="https://d.dlnws.com/lamp.jpg"><p>Apply code SAVE &amp; check eligibility.</p><ul><li>Member pricing</li><li>Tax extra</li></ul>]]></description>
  <dn:price currency="USD">19.99</dn:price><dn:retailer>Example Store</dn:retailer>
  <dn:category>Lighting</dn:category><dn:expires>2026-11-01T00:00:00-04:00</dn:expires>${overrides}
</item>`;
const feed = (items = item()) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:dn="https://www.dealnews.com/ns/rss/1.0.htm"><channel><title>DealNews</title>${items}</channel></rss>`;

test("preserves source wording, links, precise publisher price and conditions", () => {
  const [deal] = parseDealNewsFeed(feed(), date);
  assert.equal(deal.title, "Desk lamp for $20 + free shipping w/ Prime");
  assert.equal(deal.priceCents, 1999);
  assert.equal(deal.originalPriceCents, null);
  assert.equal(
    deal.sourceUrl,
    "https://www.dealnews.com/lamp.html?iref=rss&x=2",
  );
  assert.equal(
    deal.description,
    "Apply code SAVE & check eligibility.\n\nMember pricing\n\nTax extra",
  );
  assert.equal(deal.shipping, "free shipping w/ Prime");
  assert.equal(deal.merchant, "Example Store");
  assert.equal(deal.category, "Home");
  assert.equal(deal.sourceCategory, "Lighting");
  assert.equal(deal.image, "https://d.dlnws.com/lamp.jpg");
  assert.equal(deal.publishedAt, "2026-10-10T18:43:39.000Z");
});

test("namespace aliases parse correctly and navigation grouping preserves source taxonomy", () => {
  const xml = feed()
    .replaceAll("dn:", "dealnews:")
    .replace("xmlns:dn=", "xmlns:dealnews=");
  assert.equal(parseDealNewsFeed(xml, date)[0].priceCents, 1999);
  assert.equal(categoryGroup("Monitors"), "Electronics");
  assert.equal(categoryGroup("Unclassified"), "Other");
  assert.equal(categoryGroup("Vacations"), "Travel");
});

test("rejects malformed XML, DTD/entity declarations, empty feeds and oversized input", () => {
  assert.throws(
    () => parseDealNewsFeed("<rss><channel></rss>", date),
    /Malformed/,
  );
  assert.throws(
    () => parseDealNewsFeed('<!DOCTYPE x [<!ENTITY x "bad">]>' + feed(), date),
    /declarations/,
  );
  assert.throws(() => parseDealNewsFeed(feed(""), date), /count/);
  assert.throws(
    () => parseDealNewsFeed("x".repeat(MAX_FEED_BYTES + 1), date),
    /size/,
  );
});

test("HTML becomes inert complete text; active markup and unsafe URLs are excluded", () => {
  const result = descriptionFromHtml(
    '<p>Read <a href="https://example.com/?ref=a&amp;x=2">full terms</a>.</p><script>steal()</script><iframe src="https://evil.test">hidden</iframe><img src="javascript:steal()" onerror="steal()"><a href="javascript:steal()">Unsafe link text</a>',
  );
  assert.equal(result.text, "Read full terms.\nUnsafe link text");
  assert.deepEqual(result.links, [
    { text: "full terms", url: "https://example.com/?ref=a&x=2" },
  ]);
  assert.equal(result.image, null);
  assert.equal(result.text.includes("steal"), false);
});

test("does not mistake coupon amounts, zero-price promotions or other currencies for item prices", () => {
  for (const value of [
    undefined,
    { "#text": "0.00", "@_currency": "USD" },
    { "#text": "10.00", "@_currency": "EUR" },
    { "#text": "$10", "@_currency": "USD" },
    { "#text": "1.123", "@_currency": "USD" },
  ]) {
    assert.equal(parsePriceCents(value), null);
  }
  assert.equal(
    parsePriceCents({ "#text": "1234.50", "@_currency": "USD" }),
    123450,
  );
  const [deal] = parseDealNewsFeed(
    feed(item().replace('<dn:price currency="USD">19.99</dn:price>', "")),
    date,
  );
  assert.equal(deal.priceCents, null);
  assert.equal(deal.priceType, "unknown");
});

test("stable IDs and run IDs make retries idempotent, with a fresh run in the next six-hour window", () => {
  const xml = feed(item() + item());
  assert.equal(parseDealNewsFeed(xml, date).length, 1);
  assert.equal(
    parseDealNewsFeed(xml, date)[0].id,
    parseDealNewsFeed(xml, "2026-10-11T01:00:00Z")[0].id,
  );
  assert.equal(
    ingestionRunId(xml, date),
    ingestionRunId(xml, "2026-10-10T20:00:00Z"),
  );
  assert.notEqual(
    ingestionRunId(xml, date),
    ingestionRunId(xml, "2026-10-11T00:00:00Z"),
  );
});

test("expired entries are unavailable and untrusted source links are rejected", () => {
  assert.equal(
    parseDealNewsFeed(feed(), "2026-11-03T00:00:00Z")[0].status,
    "unavailable",
  );
  assert.throws(
    () =>
      parseDealNewsFeed(
        feed().replace(
          "https://www.dealnews.com/lamp.html",
          "https://evil.test/lamp.html",
        ),
        date,
      ),
    /no valid/,
  );
});

test("fetch fails closed on HTTP errors and bounded oversized response bodies", async () => {
  await assert.rejects(
    fetchDealNewsFeed(async () => new Response("No", { status: 503 })),
    /503/,
  );
  await assert.rejects(
    fetchDealNewsFeed(
      async () =>
        new Response("x", {
          headers: { "content-length": String(MAX_FEED_BYTES + 1) },
        }),
    ),
    /size/,
  );
  await assert.rejects(
    fetchDealNewsFeed(async () => new Response("x".repeat(MAX_FEED_BYTES + 1))),
    /size/,
  );
  assert.equal(
    await fetchDealNewsFeed(async () => new Response(feed())),
    feed(),
  );
});

test("cron endpoint fails closed for absent and invalid authorization including unequal UTF-8 byte lengths", async () => {
  const original = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal(
      (await GET(new Request("https://haggle.test/api/cron/ingest"))).status,
      401,
    );
    process.env.CRON_SECRET = "test";
    assert.equal(
      (
        await GET(
          new Request("https://haggle.test/api/cron/ingest", {
            headers: { authorization: "Bearer tést" },
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await GET(
          new Request("https://haggle.test/api/cron/ingest", {
            headers: { authorization: "Bearer nope" },
          }),
        )
      ).status,
      401,
    );
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});

test(
  "live PostgreSQL replay preserves offers and does not duplicate observations",
  { skip: process.env.RUN_LIVE_INGESTION_TEST !== "1" },
  async () => {
    const { config } = await import("dotenv");
    const { neon } = await import("@neondatabase/serverless");
    config({ path: ".env.local", quiet: true });
    assert.ok(process.env.DATABASE_URL);
    const xml = await fetchDealNewsFeed();
    const observedAt = new Date().toISOString();
    const expected = parseDealNewsFeed(xml, observedAt);
    const first = await ingestDeals({ xml, observedAt });
    const second = await ingestDeals({ xml, observedAt });
    assert.equal(first.runId, second.runId);
    assert.equal(second.observationsAdded, 0);
    const sql = neon(process.env.DATABASE_URL);
    const rows =
      await sql`SELECT title, source_url, price_cents FROM offers WHERE id = ${expected[0].id}`;
    assert.equal(rows[0].title, expected[0].title);
    assert.equal(rows[0].source_url, expected[0].sourceUrl);
    assert.equal(rows[0].price_cents, expected[0].priceCents);
    const counts =
      await sql`SELECT count(*)::int AS count FROM price_observations WHERE run_id = ${first.runId}`;
    assert.equal(
      counts[0].count,
      expected.filter((deal) => deal.priceCents !== null).length,
    );
  },
);
