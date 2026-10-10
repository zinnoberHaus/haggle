"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const categories = [
  "All",
  "Electronics",
  "Home",
  "Fashion",
  "Beauty",
  "Baby & Kids",
  "Grocery",
  "Travel",
];

export function CategoryNavLinks({
  activeCategory,
}: {
  activeCategory?: string;
}) {
  return (
    <nav className="category-nav" aria-label="Deal categories">
      {categories.map((category) => (
        <Link
          href={
            category === "All"
              ? "/"
              : `/?category=${encodeURIComponent(category)}`
          }
          key={category}
          aria-current={activeCategory === category ? "page" : undefined}
        >
          {category}
        </Link>
      ))}
      <Link href="/extension" className="extension-nav">
        Meet your shopping sidekick ↗
      </Link>
    </nav>
  );
}

export function CategoryNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory =
    pathname === "/" ? searchParams.get("category") || "All" : undefined;
  return <CategoryNavLinks activeCategory={activeCategory} />;
}
