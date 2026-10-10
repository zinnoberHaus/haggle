import "server-only";
import { neon } from "@neondatabase/serverless";
import type { Deal, FeedStatus, PriceObservation } from "./feed-types";

export type { Deal, FeedStatus, PriceObservation } from "./feed-types";

function database() {
  if (!process.env.DATABASE_URL)
    throw new Error("Deal storage is not configured.");
  return neon(process.env.DATABASE_URL);
}

function toDeal(row: Record<string, unknown>): Deal {
  const iso = (value: unknown) => new Date(String(value)).toISOString();
  const expired =
    row.expires_at && Date.parse(String(row.expires_at)) <= Date.now();
  const stale =
    Date.parse(String(row.fetched_at)) < Date.now() - 48 * 60 * 60 * 1000;
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    image: row.image ? String(row.image) : null,
    sourceGuid: String(row.source_guid),
    sourceUrl: String(row.source_url),
    sourceName: String(row.source_name),
    sourceLinks: row.source_links as Deal["sourceLinks"],
    publishedAt: iso(row.published_at),
    fetchedAt: iso(row.fetched_at),
    expiresAt: row.expires_at ? iso(row.expires_at) : null,
    priceCents: row.price_cents === null ? null : Number(row.price_cents),
    originalPriceCents:
      row.original_price_cents === null
        ? null
        : Number(row.original_price_cents),
    priceType: row.price_type as Deal["priceType"],
    category: String(row.category),
    sourceCategory: String(row.source_category),
    merchant: String(row.merchant),
    shipping: row.shipping ? String(row.shipping) : null,
    status: expired || stale ? "unavailable" : (row.status as Deal["status"]),
  };
}

export async function getDeals(): Promise<Deal[]> {
  const sql = database();
  const rows = await sql`SELECT * FROM offers
    WHERE status = 'active' AND fetched_at > now() - interval '48 hours'
      AND (expires_at IS NULL OR expires_at > now())
    ORDER BY published_at DESC, id ASC LIMIT 250`;
  return rows.map(toDeal);
}

export async function getDeal(id: string): Promise<Deal | null> {
  if (!/^dn-[a-f0-9]{24}$/.test(id)) return null;
  const sql = database();
  const rows = await sql`SELECT * FROM offers WHERE id = ${id} LIMIT 1`;
  return rows[0] ? toDeal(rows[0]) : null;
}

export async function getPriceHistory(id: string): Promise<PriceObservation[]> {
  if (!/^dn-[a-f0-9]{24}$/.test(id)) return [];
  const sql = database();
  const rows = await sql`SELECT price_cents, observed_at FROM price_observations
    WHERE offer_id = ${id} AND observed_at > now() - interval '1 year'
    ORDER BY observed_at ASC LIMIT 2000`;
  return rows.map((row) => ({
    priceCents: Number(row.price_cents),
    observedAt: new Date(row.observed_at).toISOString(),
  }));
}

export async function getFeedStatus(): Promise<FeedStatus> {
  const sql = database();
  const rows =
    await sql`SELECT fetched_at, item_count FROM feed_ingestion_runs ORDER BY fetched_at DESC LIMIT 1`;
  return {
    sourceName: "DealNews",
    lastSuccessfulFetch: rows[0]
      ? new Date(rows[0].fetched_at).toISOString()
      : null,
    itemCount: Number(rows[0]?.item_count ?? 0),
  };
}
