import type { Metadata } from "next";
import Link from "next/link";
import FeeCalculator from "@/components/fee-calculator";

export const metadata: Metadata = {
  title: "How Haggle earns",
  description:
    "Browse Haggle for free. See the proposed savings-based agent fee and try the fee calculator.",
};

export default function PricingPage() {
  return (
    <div style={{ display: "grid", gap: "2rem", paddingBlock: "2rem 4rem" }}>
      <header className="content-narrow">
        <p className="eyebrow">How we earn</p>
        <h1 className="page-title">A good deal should stay a good deal.</h1>
        <p className="muted">
          Browsing Haggle is free. There is no subscription and no payment card
          required. Paid agent tasks are planned; Haggle is not charging agent
          fees today.
        </p>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "1rem",
        }}
      >
        <section className="panel">
          <p className="eyebrow">Available now</p>
          <h2 style={{ fontSize: "3.5rem", margin: ".5rem 0" }}>$0</h2>
          <p>
            Explore the deal feed, read buying guides, search Haggle, and save
            deals to your account.
          </p>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
            <li>Browse without signing up</li>
            <li>Compare the offers in our current catalog</li>
            <li>Keep a personal list of saved deals</li>
            <li>Use the browser search companion</li>
          </ul>
          <Link className="button" href="/">
            Browse the deals
          </Link>
        </section>
        <section
          className="panel"
          style={{ background: "#17160F", color: "#F4F1EA" }}
        >
          <p className="eyebrow" style={{ color: "#C9C3B5" }}>
            Planned agent pricing
          </p>
          <h2
            style={{ fontSize: "3.5rem", margin: ".5rem 0", color: "#F2662F" }}
          >
            10%
          </h2>
          <p>Of the savings a task delivers, capped at $20 per task.</p>
          <ul style={{ paddingLeft: "1.25rem", lineHeight: 2 }}>
            <li>You review the result before approving a task</li>
            <li>No savings means no fee</li>
            <li>Estimated cashback is separate from cash saved</li>
            <li>The fee and what you keep are shown together</li>
          </ul>
          <p style={{ color: "#C9C3B5", fontSize: ".9rem" }}>
            This describes the intended model, not an active billing service.
            The Cart Agent currently helps you compare; it does not place orders
            or charge your card.
          </p>
        </section>
      </div>
      <FeeCalculator />
      <div className="grid-three">
        <section>
          <h2>Clear about links</h2>
          <p className="muted">
            Offers may lead to DealNews or a retailer through affiliate links.
            The destination may earn a commission from a purchase. Review the
            seller’s price and terms before paying.
          </p>
        </section>
        <section>
          <h2>A price, with context</h2>
          <p className="muted">
            A listed price can depend on a coupon, membership, size, or color.
            We show available conditions and link to the source so you can
            check.
          </p>
        </section>
        <section>
          <h2>You stay in charge</h2>
          <p className="muted">
            Haggle does not buy products, submit refund claims, or store your
            payment-card details. You complete purchases directly with a
            merchant.
          </p>
        </section>
      </div>
    </div>
  );
}
