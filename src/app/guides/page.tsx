import type { Metadata } from "next";
import Link from "next/link";
import { guides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Buying guides",
  description:
    "Practical guides to final prices, price targets, cashback, and coupon exclusions.",
};

export default function GuidesPage() {
  return (
    <div style={{ paddingBlock: "2rem 4rem" }}>
      <header className="content-narrow" style={{ marginBottom: "2.5rem" }}>
        <p className="eyebrow">The Haggle field guide</p>
        <h1 className="page-title">A little know-how. A better buy.</h1>
        <p className="muted">
          Short, practical guides to the parts of a deal that deserve a second
          look.
        </p>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "2rem",
        }}
      >
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            style={{
              color: "inherit",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                background: guide.tint,
                borderRadius: 14,
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "2rem",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif), Georgia, serif",
                  fontSize: "7rem",
                  lineHeight: 1,
                }}
              >
                {guide.symbol}
              </span>
              <span
                style={{
                  maxWidth: "10ch",
                  fontSize: "1.2rem",
                  lineHeight: 1.25,
                }}
              >
                {guide.category}
              </span>
            </div>
            <p className="eyebrow" style={{ marginTop: "1rem" }}>
              {guide.category}
            </p>
            <h2
              style={{
                margin: ".4rem 0",
                fontSize: "1.65rem",
                lineHeight: 1.2,
              }}
            >
              {guide.title}
            </h2>
            <p className="muted">{guide.description}</p>
            <span className="muted" style={{ fontSize: ".85rem" }}>
              {guide.readTime}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
