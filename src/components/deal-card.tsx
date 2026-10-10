import Link from "next/link";
import type { Deal } from "@/lib/feed-types";
import { money, shortDate } from "@/lib/format";
import { SaveButton } from "./save-button";
export function DealImage({
  deal,
  priority = false,
}: {
  deal: Deal;
  priority?: boolean;
}) {
  return (
    <div className="product-image">
      {deal.image ? (
        <img
          src={deal.image}
          alt=""
          loading={priority ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="image-fallback">
          Good find
          <br />
          <span>↓</span>
        </span>
      )}
      {deal.originalPriceCents &&
      deal.priceCents !== null &&
      deal.originalPriceCents > deal.priceCents ? (
        <span className="discount-sticker">
          −{Math.round((1 - deal.priceCents / deal.originalPriceCents) * 100)}%
        </span>
      ) : null}
    </div>
  );
}
export function DealCard({
  deal,
  variant = "card",
}: {
  deal: Deal;
  variant?: "card" | "lead" | "row";
}) {
  return (
    <article className={`deal-card ${variant}`}>
      <Link
        href={`/deals/${deal.id}`}
        className="deal-visual"
        aria-label={deal.title}
      >
        <DealImage deal={deal} priority={variant === "lead"} />
      </Link>
      <div className="deal-copy">
        <div className="eyebrow">
          {variant === "lead" ? "A good place to start · " : ""}
          {deal.merchant} <span>{shortDate(deal.publishedAt)}</span>
        </div>
        <Link href={`/deals/${deal.id}`}>
          <h2>{deal.title}</h2>
        </Link>
        {variant !== "row" && (
          <div className="price-line">
            <strong>
              {deal.priceType === "from" ? "From " : ""}
              {money(deal.priceCents)}
            </strong>
            {deal.originalPriceCents && <s>{money(deal.originalPriceCents)}</s>}
          </div>
        )}
        <div className="deal-meta">
          <a
            href={deal.sourceUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
          >
            From {deal.sourceName} ↗
          </a>
          <SaveButton offerId={deal.id} />
        </div>
      </div>
    </article>
  );
}
