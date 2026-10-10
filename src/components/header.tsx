import Link from "next/link";
import { Search, Bookmark, ArrowDown } from "lucide-react";
export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Haggle home">
          <span className="brand-mark">
            <ArrowDown size={21} />
          </span>
          haggle<span className="beta-label">beta</span>
        </Link>
        <form action="/ask" className="search-box">
          <Search size={18} />
          <input
            name="q"
            aria-label="Search deals and stores"
            placeholder="Search deals and stores, or ask a question"
          />
          <button type="submit">Search</button>
        </form>
        <nav className="top-nav">
          <Link href="/coupons">Coupons</Link>
          <Link href="/guides">Guides</Link>
          <Link href="/cart">Cart Agent</Link>
        </nav>
        <Link href="/saved" className="button small my-haggle">
          <Bookmark size={15} /> My Haggle
        </Link>
      </div>
      <nav className="category-nav" aria-label="Deal categories">
        {[
          "All",
          "Electronics",
          "Home",
          "Fashion",
          "Beauty",
          "Baby & Kids",
          "Grocery",
          "Travel",
        ].map((c) => (
          <Link
            href={c === "All" ? "/" : `/?category=${encodeURIComponent(c)}`}
            key={c}
          >
            {c}
          </Link>
        ))}
        <Link href="/extension" className="extension-nav">
          Meet your shopping sidekick ↗
        </Link>
      </nav>
    </header>
  );
}
