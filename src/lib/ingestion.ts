import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { Parser } from "htmlparser2";
import type { Deal } from "./feed-types";

export const DEALNEWS_FEED_URL = "https://www.dealnews.com/?rss=1&sort=time";
export const MAX_FEED_BYTES = 2 * 1024 * 1024;
export const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_ITEMS = 250;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function textValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function webUrl(raw: unknown, allowedHosts?: string[]): string | null {
  if (typeof raw !== "string") return null;
  try {
    const value = raw.trim();
    const url = new URL(value);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    if (allowedHosts && !allowedHosts.includes(url.hostname)) return null;
    // Keep the exact source URL, including referral parameters and encoding.
    return value;
  } catch {
    return null;
  }
}

/** Convert presentational markup to inert text while retaining source links. */
export function descriptionFromHtml(html: string): {
  text: string;
  links: { text: string; url: string }[];
  image: string | null;
} {
  if (html.length > 100_000)
    throw new Error("Feed description exceeds the accepted size.");
  const blocks = new Set([
    "p",
    "div",
    "ul",
    "ol",
    "li",
    "br",
    "h1",
    "h2",
    "h3",
    "h4",
    "section",
  ]);
  const inactive = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "template",
    "svg",
    "math",
  ]);
  const stack: string[] = [];
  const links: { text: string; url: string }[] = [];
  let result = "";
  let image: string | null = null;
  let anchor: { text: string; url: string } | null = null;
  const parser = new Parser(
    {
      onopentag(name, attributes) {
        if (stack.length || inactive.has(name)) {
          stack.push(name);
          return;
        }
        if (blocks.has(name)) result += "\n";
        if (name === "img" && !image)
          image = webUrl(attributes.src, ["d.dlnws.com"]);
        if (name === "a") {
          const url = webUrl(attributes.href);
          anchor = url ? { text: "", url } : null;
        }
      },
      ontext(text) {
        if (stack.length) return;
        result += text;
        if (anchor) anchor.text += text;
      },
      onclosetag(name) {
        if (stack.length) {
          if (stack[stack.length - 1] === name) stack.pop();
          return;
        }
        if (blocks.has(name)) result += "\n";
        if (name === "a" && anchor) {
          links.push({ text: anchor.text.trim(), url: anchor.url });
          anchor = null;
        }
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  return {
    text: result
      .replace(/[\t\r ]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    links,
    image,
  };
}

/** Only use the publisher's structured USD price. Do not infer prices from prose. */
export function parsePriceCents(value: unknown): number | null {
  if (!value || typeof value !== "object") return null;
  const field = value as Record<string, unknown>;
  if (field["@_currency"] !== "USD") return null;
  const raw = textValue(field).trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  // The feed uses 0.00 for unpriced promotions; don't advertise those as free.
  return cents > 0 && cents <= 999_999_999 ? cents : null;
}

function isoDate(value: string): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

/** Haggle navigation classification; sourceCategory is retained separately. */
export function categoryGroup(sourceCategory: string): string {
  if (/baby|kids|children|diaper|stroller|toy/i.test(sourceCategory))
    return "Baby & Kids";
  if (/beauty|cosmetic|skin.?care|makeup|fragrance|hair/i.test(sourceCategory))
    return "Beauty";
  if (/grocer|food|drink|beverage|coffee|snack/i.test(sourceCategory))
    return "Grocery";
  if (/travel|vacation|flight|hotel|cruise|luggage/i.test(sourceCategory))
    return "Travel";
  if (
    /electronic|phone|airpods|computer|laptop|tablet|monitor|printer|scanner|video game|camera|drone|television|headphone|audio|speaker|smartwatch/i.test(
      sourceCategory,
    )
  )
    return "Electronics";
  if (
    /cloth|fashion|shoe|apparel|activewear|t-shirt|watch|jewelry|accessor|backpack|handbag/i.test(
      sourceCategory,
    )
  )
    return "Fashion";
  if (
    /home|garden|bed|kitchen|lighting|lamp|furniture|oven|stove|refrigerator|freezer|tool|saw|generator|power station|flower|seasonal|holiday|cleaning/i.test(
      sourceCategory,
    )
  )
    return "Home";
  return "Other";
}

export function parseDealNewsFeed(
  xml: string,
  fetchedAt = new Date().toISOString(),
): Deal[] {
  if (Buffer.byteLength(xml, "utf8") > MAX_FEED_BYTES)
    throw new Error("Feed exceeds the accepted size.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error("Document declarations are not allowed in feeds.");
  if (!isoDate(fetchedAt)) throw new Error("Invalid observation time.");
  const validated = XMLValidator.validate(xml);
  if (validated !== true) throw new Error("Malformed feed XML.");
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
  });
  const data = parser.parse(xml);
  const sourceNamespace = Object.entries(data?.rss ?? {})
    .find(
      ([key, value]) =>
        key.startsWith("@_xmlns:") &&
        value === "https://www.dealnews.com/ns/rss/1.0.htm",
    )?.[0]
    ?.slice(8);
  if (!sourceNamespace)
    throw new Error("Feed is missing the DealNews namespace.");
  const sourceField = (item: Record<string, unknown>, name: string) =>
    item[`${sourceNamespace}:${name}`];
  const rawItems = data?.rss?.channel?.item;
  const items: Record<string, unknown>[] = Array.isArray(rawItems)
    ? rawItems
    : rawItems
      ? [rawItems]
      : [];
  if (items.length === 0 || items.length > MAX_ITEMS)
    throw new Error("Feed has an unexpected item count.");
  const deals = new Map<string, Deal>();
  for (const item of items) {
    const title = textValue(item.title).trim();
    const sourceUrl = webUrl(textValue(item.link), [
      "www.dealnews.com",
      "dealnews.com",
    ]);
    const sourceGuid = textValue(item.guid).trim();
    const publishedAt = isoDate(textValue(item.pubDate));
    if (
      !title ||
      title.length > 2_000 ||
      !sourceUrl ||
      !sourceGuid ||
      sourceGuid.length > 2_000 ||
      !publishedAt
    )
      continue;
    const description = descriptionFromHtml(textValue(item.description));
    const media = item["media:content"] as Record<string, unknown> | undefined;
    const image =
      webUrl(media?.["@_url"], ["d.dlnws.com"]) ?? description.image;
    const priceCents = parsePriceCents(sourceField(item, "price"));
    const expiresAt = isoDate(textValue(sourceField(item, "expires")));
    const sourceCategory = textValue(sourceField(item, "category")).trim();
    const id = `dn-${hash(sourceGuid).slice(0, 24)}`;
    const shipping =
      title
        .match(
          /\+\s*(free shipping(?:\s+w\/[^+]+)?|\$\d+(?:\.\d{2})? shipping)/i,
        )?.[1]
        ?.trim() ?? null;
    const deal: Deal = {
      id,
      title,
      sourceGuid,
      sourceUrl,
      sourceName: "DealNews",
      sourceLinks: description.links,
      description: description.text,
      image,
      publishedAt,
      fetchedAt: new Date(fetchedAt).toISOString(),
      expiresAt,
      priceCents,
      originalPriceCents: null,
      priceType:
        priceCents === null
          ? "unknown"
          : /\bfrom\b/i.test(title)
            ? "from"
            : "exact",
      category: categoryGroup(sourceCategory),
      sourceCategory,
      merchant: textValue(sourceField(item, "retailer")).trim() || "See source",
      shipping,
      status:
        expiresAt && Date.parse(expiresAt) <= Date.parse(fetchedAt)
          ? "unavailable"
          : "active",
    };
    const previous = deals.get(id);
    if (!previous || deal.publishedAt > previous.publishedAt)
      deals.set(id, deal);
  }
  if (deals.size === 0) throw new Error("Feed contains no valid offers.");
  return [...deals.values()].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  );
}

export function ingestionRunId(xml: string, observedAt: string): string {
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid observation time.");
  // A retry in the same six-hour window is idempotent; later observations remain real data.
  return hash(
    `${DEALNEWS_FEED_URL}\n${Math.floor(timestamp / REFRESH_INTERVAL_MS)}\n${xml}`,
  );
}

export async function fetchDealNewsFeed(
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const response = await fetcher(DEALNEWS_FEED_URL, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "Haggle/0.1 (DealNews RSS reader)",
    },
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(`DealNews returned HTTP ${response.status}.`);
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_FEED_BYTES)
    throw new Error("Feed exceeds the accepted size.");
  if (!response.body) throw new Error("Feed response has no body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error("Feed exceeds the accepted size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function ingestDeals(
  options: { xml?: string; observedAt?: string; databaseUrl?: string } = {},
) {
  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for ingestion.");
  const xml = options.xml ?? (await fetchDealNewsFeed());
  const observedAt = options.observedAt ?? new Date().toISOString();
  const deals = parseDealNewsFeed(xml, observedAt);
  const runId = ingestionRunId(xml, observedAt);
  const sql = neon(databaseUrl);
  const records = JSON.stringify(
    deals.map((deal) => ({
      id: deal.id,
      source_guid: deal.sourceGuid,
      title: deal.title,
      description: deal.description,
      image: deal.image,
      source_url: deal.sourceUrl,
      source_name: deal.sourceName,
      source_links: deal.sourceLinks,
      published_at: deal.publishedAt,
      fetched_at: deal.fetchedAt,
      expires_at: deal.expiresAt,
      price_cents: deal.priceCents,
      original_price_cents: deal.originalPriceCents,
      price_type: deal.priceType,
      category: deal.category,
      source_category: deal.sourceCategory,
      merchant: deal.merchant,
      shipping: deal.shipping,
      status: deal.status,
    })),
  );
  const results = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext('haggle-dealnews-ingest'))`,
    sql.query(
      `INSERT INTO offers (
      id, source_guid, title, description, image, source_url, source_name, source_links,
      published_at, fetched_at, expires_at, price_cents, original_price_cents, price_type,
      category, source_category, merchant, shipping, status
    ) SELECT * FROM jsonb_to_recordset($1::jsonb) AS item (
      id text, source_guid text, title text, description text, image text, source_url text,
      source_name text, source_links jsonb, published_at timestamptz, fetched_at timestamptz,
      expires_at timestamptz, price_cents integer, original_price_cents integer, price_type text,
      category text, source_category text, merchant text, shipping text, status text
    ) ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, description = EXCLUDED.description, image = EXCLUDED.image,
      source_url = EXCLUDED.source_url, source_links = EXCLUDED.source_links,
      published_at = EXCLUDED.published_at, fetched_at = EXCLUDED.fetched_at, expires_at = EXCLUDED.expires_at,
      price_cents = EXCLUDED.price_cents, original_price_cents = EXCLUDED.original_price_cents,
      price_type = EXCLUDED.price_type, category = EXCLUDED.category, source_category = EXCLUDED.source_category, merchant = EXCLUDED.merchant,
      shipping = EXCLUDED.shipping, status = EXCLUDED.status
    WHERE offers.fetched_at <= EXCLUDED.fetched_at`,
      [records],
    ),
    sql.query(
      `INSERT INTO feed_ingestion_runs (id, source_url, fetched_at, item_count)
      VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET fetched_at = GREATEST(feed_ingestion_runs.fetched_at, EXCLUDED.fetched_at)`,
      [runId, DEALNEWS_FEED_URL, observedAt, deals.length],
    ),
    sql.query(
      `INSERT INTO price_observations (offer_id, run_id, price_cents, observed_at)
      SELECT id, $2, price_cents, fetched_at
      FROM jsonb_to_recordset($1::jsonb) AS item(id text, price_cents integer, fetched_at timestamptz)
      WHERE price_cents IS NOT NULL
      ON CONFLICT (offer_id, run_id) DO NOTHING RETURNING offer_id`,
      [records, runId],
    ),
    sql.query(
      `INSERT INTO target_alerts (user_id, offer_id, target_price_cents, observed_price_cents, observed_at)
      SELECT saved.user_id, offer.id, saved.target_price_cents, offer.price_cents, offer.fetched_at
      FROM saved_deals saved JOIN offers offer ON offer.id = saved.offer_id
      WHERE saved.target_price_cents IS NOT NULL AND offer.price_cents <= saved.target_price_cents
        AND offer.fetched_at = $1::timestamptz AND offer.status = 'active'
        AND (offer.expires_at IS NULL OR offer.expires_at > $1::timestamptz)
      ON CONFLICT (user_id, offer_id, target_price_cents) DO NOTHING RETURNING id`,
      [observedAt],
    ),
  ]);
  return {
    source: "DealNews",
    runId,
    fetchedAt: observedAt,
    count: deals.length,
    observationsAdded: results[3].length,
    alertsAdded: results[4].length,
  };
}
