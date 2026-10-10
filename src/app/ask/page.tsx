import Link from "next/link";
import { getDeals } from "@/lib/deals";
import { matchQuery } from "@/lib/format";
import { DealCard } from "@/components/deal-card";
import { AskAssistant } from "@/components/ask-assistant";
export const dynamic = "force-dynamic";
export default async function Ask({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 500);
  const deals = await getDeals();
  const budget = /under\s*\$?([\d,.]+)/i.exec(query);
  const max = budget ? Number(budget[1].replaceAll(",", "")) * 100 : null;
  const results = deals.filter(
    (d) =>
      matchQuery(
        d.title + " " + d.merchant + " " + d.category + " " + d.description,
        query,
      ) &&
      (max === null || (d.priceCents !== null && d.priceCents <= max)),
  );
  return (
    <>
      <span className="eyebrow">Find your kind of good deal</span>
      <h1 className="page-title">What’s on your list?</h1>
      <form className="ask-query">
        <input
          name="q"
          aria-label="What are you shopping for?"
          placeholder="Try ‘headphones under $150’"
          defaultValue={query}
          maxLength={500}
        />
        <button className="button">Search</button>
      </form>
      <div className="ask-layout">
        <div>
          {query && <AskAssistant key={query} query={query} />}
          <div className="section-heading" style={{ marginTop: 28 }}>
            <h2>
              {query
                ? `${results.length} matching offers`
                : "A few places to start"}
            </h2>
            <span className="small-text muted">From DealNews</span>
          </div>
          {results.slice(0, 25).map((d) => (
            <DealCard deal={d} key={d.id} variant="row" />
          ))}
          {!results.length && (
            <div className="empty-state">
              <h3>Nothing quite like that in today’s feed.</h3>
              <p>
                Try the product type or a store name. Haggle searches the
                current collected offers, so it doesn’t cover every store.
              </p>
              <Link href="/">Browse all deals</Link>
            </div>
          )}
        </div>
        <aside>
          <section className="panel">
            <h2>A good question goes a long way.</h2>
            <p className="muted">
              Tell us the product, your budget, and what matters to you.
            </p>
            <div className="store-list">
              {["laptop", "home", "under $25", "shoes"].map((s) => (
                <Link href={`/ask?q=${encodeURIComponent(s)}`} key={s}>
                  {s} ↗
                </Link>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>What’s in the answer?</h2>
            <p className="muted">
              The current feed, a clear explanation, and links you can check. No
              invented coupons or reviews.
            </p>
            <Link
              href="/guides"
              className="button secondary"
              style={{ marginTop: 18 }}
            >
              Browse the guides
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
