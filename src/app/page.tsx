import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowUpRight,
  Sparkles,
  ArrowDown,
  ShieldCheck,
  Bookmark,
} from "lucide-react";
import { getDeals } from "@/lib/deals";
import { DealCard } from "@/components/deal-card";
import { DealFeed } from "@/components/deal-feed";
import { money } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "All" } = await searchParams;
  const deals = await getDeals();
  const priced = deals.filter((d) => d.priceCents !== null && d.image);
  const lead = priced[0] ?? deals[0];
  const picks = priced.filter((d) => d.id !== lead?.id).slice(0, 3);
  const merchants = [...new Set(deals.map((d) => d.merchant))]
    .filter((m) => m !== "Various stores")
    .slice(0, 6);
  return (
    <div className="home">
      <section className="rundown">
        <div className="rundown-title">
          <span className="eyebrow">Your shopping, a little smarter</span>
          <h1>Today’s rundown</h1>
          <span className="rundown-caption">
            <span className="tiny-mark">↓</span>Good finds. No rabbit holes.
          </span>
        </div>
        <Link href="#feed">
          <span className="tag green">Fresh finds</span>
          <p>
            {deals.length} offers in one place.
            <br />
            Your next good find is down here.
          </p>
          <ArrowUpRight size={17} />
        </Link>
        <Link href="/guides/compare-the-final-price">
          <span className="tag blue">Before you buy</span>
          <p>
            The price tag is only
            <br />
            part of the story.
          </p>
          <ArrowUpRight size={17} />
        </Link>
        <Link href="/saved">
          <span className="tag peach">Keep an eye on it</span>
          <p>
            Not quite your price?
            <br />
            Save it for later.
          </p>
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <section>
        <div className="section-heading">
          <h2>Worth a look</h2>
          <span className="muted small-text">
            A few shortcuts to the good stuff
          </span>
        </div>
        <div className="event-grid">
          {[
            {
              name: "A smarter setup",
              copy: "Tech that earns its place.",
              cat: "Electronics",
              className: "event-lilac",
              label: "Electronics",
            },
            {
              name: "Little home upgrades",
              copy: "Make your everyday feel better.",
              cat: "Home",
              className: "event-peach",
              label: "Home & living",
            },
            {
              name: "Good style. Better price.",
              copy: "Find something that feels like you.",
              cat: "Fashion",
              className: "event-yellow",
              label: "Fashion",
            },
            {
              name: "Everyday, for less",
              copy: "Stock up without overspending.",
              cat: "Grocery",
              className: "event-green",
              label: "Daily essentials",
            },
          ].map((e) => (
            <Link
              key={e.cat}
              className={`event-tile ${e.className}`}
              href={`/?category=${e.cat}`}
            >
              <div>
                <span className="eyebrow">{e.label}</span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{e.name}</h3>
              <p>{e.copy}</p>
            </Link>
          ))}
        </div>
      </section>
      <div className="hub-columns">
        <div className="feed-column">
          {category === "All" && lead && (
            <>
              <DealCard deal={lead} variant="lead" />
              <div className="picks-grid">
                {picks.map((d) => (
                  <DealCard key={d.id} deal={d} />
                ))}
              </div>
            </>
          )}
          <Suspense>
            <DealFeed deals={deals} category={category} />
          </Suspense>
        </div>
        <aside className="hub-sidebar">
          <section className="ask-card">
            <span className="eyebrow">
              <Sparkles size={15} /> Ask Haggle
            </span>
            <h2>
              Not sure it’s a good price?
              <br />
              Let’s figure it out.
            </h2>
            <p>A little help, whenever you need it.</p>
            {[
              "Find me a laptop under $500",
              "What are the best home deals?",
              "Something useful under $25",
            ].map((q) => (
              <Link key={q} href={`/ask?q=${encodeURIComponent(q)}`}>
                “{q}” <ArrowUpRight size={14} />
              </Link>
            ))}
          </section>
          <section className="sidebar-section">
            <div className="section-heading">
              <h2>Fresh off the feed</h2>
              <span className="live-dot" />
            </div>
            {priced.slice(4, 8).map((d, i) => (
              <Link className="trending-row" key={d.id} href={`/deals/${d.id}`}>
                <span className="rank">0{i + 1}</span>
                <div>
                  <h3>{d.title}</h3>
                  <span>
                    {d.merchant} <strong>{money(d.priceCents)}</strong>
                  </span>
                </div>
              </Link>
            ))}
          </section>
          <section className="sidebar-section">
            <h2>Your shopping, on your terms.</h2>
            <div className="promise-row">
              <ShieldCheck size={20} />
              <p>
                Browse first.
                <br />
                <span>No account needed to look around.</span>
              </p>
            </div>
            <div className="promise-row">
              <Bookmark size={20} />
              <p>
                Keep the good ones.
                <br />
                <span>Make a free account to save deals.</span>
              </p>
            </div>
            <div className="promise-row">
              <ArrowDown size={20} />
              <p>
                Know where it comes from.
                <br />
                <span>Every offer links to its source.</span>
              </p>
            </div>
          </section>
          <section className="extension-card">
            <span className="tiny-mark">↓</span>
            <h2>
              A second look,
              <br />
              while you shop.
            </h2>
            <p>Send a product to Haggle right from your browser.</p>
            <Link href="/extension" className="button secondary">
              Get the extension <ArrowUpRight size={15} />
            </Link>
          </section>
          <section>
            <h2>Stores in the feed</h2>
            <div className="store-list">
              {merchants.map((m) => (
                <Link href={`/ask?q=${encodeURIComponent(m)}`} key={m}>
                  {m}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
      <section className="guides-banner">
        <div>
          <span className="eyebrow">A little shopping know-how</span>
          <h2>
            Good deals start with
            <br />
            better questions.
          </h2>
        </div>
        <Link href="/guides">
          Our no-nonsense shopping guides <ArrowUpRight size={19} />
        </Link>
      </section>
      <div className="trust-strip">
        <span>No pressure to sign up</span>
        <span>Sources, always</span>
        <span>Your money stays yours</span>
      </div>
    </div>
  );
}
