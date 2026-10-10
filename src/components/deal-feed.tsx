"use client";
import { useState } from "react";
import { DealCard } from "./deal-card";
import type { Deal } from "@/lib/feed-types";
export function DealFeed({
  deals,
  category,
}: {
  deals: Deal[];
  category: string;
}) {
  const [sort, setSort] = useState("Latest");
  const [limit, setLimit] = useState(12);
  const filtered = deals.filter(
    (d) => category === "All" || d.category === category,
  );
  const sorted = [...filtered].sort((a, b) =>
    sort === "Lowest price"
      ? (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
      : sort === "Biggest drop"
        ? (b.originalPriceCents ?? 0) -
          (b.priceCents ?? 0) -
          ((a.originalPriceCents ?? 0) - (a.priceCents ?? 0))
        : Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  return (
    <section id="feed">
      <div className="feed-heading">
        <h2>
          {category === "All" ? "The latest good finds" : `${category} deals`}
        </h2>
        <div className="sort-tabs" aria-label="Sort deals">
          {[
            "Latest",
            "Lowest price",
            ...(deals.some(
              (d) =>
                d.originalPriceCents !== null &&
                d.priceCents !== null &&
                d.originalPriceCents > d.priceCents,
            )
              ? ["Biggest drop"]
              : []),
          ].map((s) => (
            <button
              key={s}
              aria-pressed={sort === s}
              className={sort === s ? "active" : ""}
              onClick={() => setSort(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <p className="source-note">
        From DealNews · {filtered.length} sourced offers · Confirm the final
        price at the store
      </p>
      {sorted.slice(0, limit).map((d) => (
        <DealCard key={d.id} deal={d} variant="row" />
      ))}
      {!filtered.length && (
        <div className="empty-state">
          <h3>Nothing in this aisle just yet.</h3>
          <p>
            Try another category, or check back after the next feed refresh.
          </p>
          <a href="/">Browse all deals</a>
        </div>
      )}
      {sorted.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setLimit(limit + 12)}
        >
          Show more good finds
        </button>
      )}
    </section>
  );
}
