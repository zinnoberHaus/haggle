import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal, getPriceHistory, getDeals } from "@/lib/deals";
import { DealImage, DealCard } from "@/components/deal-card";
import { SaveButton } from "@/components/save-button";
import { AlertForm } from "@/components/alert-form";
import { money, shortDate } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const [history, all] = await Promise.all([getPriceHistory(id), getDeals()]);
  const prices = history.map((h) => h.priceCents);
  const min = prices.length ? Math.min(...prices) : 0,
    max = prices.length ? Math.max(...prices) : 0;
  const points = history
    .map(
      (h, i) =>
        `${20 + (i * 560) / Math.max(history.length - 1, 1)},${130 - ((h.priceCents - min) / Math.max(max - min, 1)) * 110}`,
    )
    .join(" ");
  return (
    <>
      <div className="breadcrumb">
        <Link href="/">All deals</Link> / {deal.category}
      </div>
      <div className="detail-grid">
        <DealImage deal={deal} priority />
        <div className="detail-info">
          <span className="eyebrow">
            {deal.merchant} · From {deal.sourceName}
          </span>
          <h1>{deal.title}</h1>
          <div className="price-line">
            <strong>
              {deal.priceType === "from" ? "From " : ""}
              {money(deal.priceCents)}
            </strong>
            {deal.originalPriceCents && <s>{money(deal.originalPriceCents)}</s>}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>
            Published {shortDate(deal.publishedAt)} · Retrieved{" "}
            {shortDate(deal.fetchedAt)}
          </p>
          {deal.status === "unavailable" && (
            <p className="notice">
              This offer has expired or hasn’t been observed recently. The last
              recorded price may no longer be available.
            </p>
          )}
          <div className="detail-actions">
            <a
              href={deal.sourceUrl}
              className="button"
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              See offer at {deal.sourceName} ↗
            </a>
            <SaveButton offerId={deal.id} />
          </div>
          <div className="notice">
            Check the offer’s size, condition, shipping, and membership
            requirements before buying. Prices may have changed since
            publication. Source links may earn the publisher a commission.
          </div>
          <p className="small-text muted">Haggle never buys on your behalf.</p>
          <p style={{ marginTop: 14 }}>
            <Link href={`/compare?offerId=${deal.id}`}>
              Compare shipping, coupons, and rewards ↗
            </Link>
          </p>
          <p style={{ marginTop: 10 }}>
            <Link href={`/purchases?offer=${deal.id}`}>
              Already bought it? Record your purchase ↗
            </Link>
          </p>
        </div>
      </div>
      <div className="grid-two">
        <section className="panel">
          <h2>The full offer</h2>
          <p className="source-content">{deal.description}</p>
          {deal.sourceLinks.length > 0 && (
            <div className="store-list">
              {deal.sourceLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  {link.text || "Source link"} ↗
                </a>
              ))}
            </div>
          )}
          <p style={{ marginTop: 18 }}>
            <a
              href={deal.sourceUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              style={{ textDecoration: "underline" }}
            >
              Read the original at {deal.sourceName} ↗
            </a>
          </p>
        </section>
        <div>
          <section className="panel">
            <div className="section-heading">
              <h2>Price notebook</h2>
              <span className="tag">Observed by Haggle</span>
            </div>
            {history.length > 1 ? (
              <>
                <svg
                  className="history-chart"
                  viewBox="0 0 600 160"
                  role="img"
                  aria-label={`Observed price history: lowest ${money(min)}, highest ${money(max)}`}
                >
                  <line x1="20" y1="140" x2="580" y2="140" stroke="#dcd8cd" />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#a9400f"
                    strokeWidth="3"
                  />
                </svg>
                <div className="history-dates">
                  <span>{shortDate(history[0].observedAt)}</span>
                  <span>{shortDate(history.at(-1)!.observedAt)}</span>
                </div>
                <p className="muted small-text" style={{ marginTop: 15 }}>
                  Observed low {money(min)} · {history.length} checks. Based on
                  publisher prices, excluding unlisted shipping or tax.
                </p>
              </>
            ) : (
              <>
                <p>We’re starting this item’s price history.</p>
                <p className="muted small-text">
                  {history.length === 1
                    ? `First observation: ${money(history[0].priceCents)} on ${shortDate(history[0].observedAt)}.`
                    : "No reliable numeric price has been reported yet."}{" "}
                  We’ll add new observations as this offer appears in the feed.
                </p>
              </>
            )}
          </section>
          <section className="panel">
            <h2>Your price, your call.</h2>
            <p className="muted" style={{ marginBottom: 20 }}>
              Save a target to see when a collected price is within your budget.
            </p>
            <AlertForm offerId={deal.id} priceCents={deal.priceCents} />
            <p className="small-text muted" style={{ marginTop: 14 }}>
              Matches appear in My Haggle. Email delivery is not enabled yet.
            </p>
          </section>
        </div>
      </div>
      <section style={{ marginTop: 30 }}>
        <div className="section-heading">
          <h2>A few more to consider</h2>
          <Link href="/">Browse all</Link>
        </div>
        <div className="grid-three">
          {all
            .filter((d) => d.id !== id && d.category === deal.category)
            .slice(0, 3)
            .map((d) => (
              <DealCard deal={d} key={d.id} />
            ))}
        </div>
      </section>
    </>
  );
}
