export type Deal = {
  id: string;
  title: string;
  /** Full source description as plain text. Render as text, never as HTML. */
  description: string;
  image: string | null;
  sourceUrl: string;
  sourceGuid: string;
  sourceName: string;
  sourceLinks: { text: string; url: string }[];
  publishedAt: string;
  fetchedAt: string;
  expiresAt: string | null;
  priceCents: number | null;
  originalPriceCents: number | null;
  priceType: "exact" | "from" | "unknown";
  category: string;
  sourceCategory: string;
  merchant: string;
  shipping: string | null;
  status: "active" | "unavailable";
};

export type PriceObservation = {
  priceCents: number;
  observedAt: string;
};

export type FeedStatus = {
  sourceName: string;
  lastSuccessfulFetch: string | null;
  itemCount: number;
};
