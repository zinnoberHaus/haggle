import Link from "next/link";
import { getDeals } from "@/lib/deals";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { shortDate, money } from "@/lib/format";
import { MyNav } from "@/components/my-nav";
import { CartComparison } from "@/components/cart-comparison";
export const dynamic = "force-dynamic";
export default async function Cart() {
  const user = await getCurrentUser();
  const plans = user
    ? await sql`SELECT id,items,created_at AS "createdAt" FROM cart_plans WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 10`
    : [];
  return (
    <>
      <MyNav />
      <span className="eyebrow">Cart Agent · Comparison beta</span>
      <h1 className="page-title">Same list. A second look.</h1>
      <p className="page-intro">
        Before you check out, compare your list with the offers we’ve collected.
        Nothing changes until you choose it.
      </p>
      <CartComparison deals={await getDeals()} />
      {plans.length > 0 && (
        <section className="panel">
          <h2>Your saved shopping plans</h2>
          {plans.map((plan) => (
            <Link
              className="receipt-row"
              href={`/checkout?plan=${plan.id}`}
              key={plan.id}
            >
              <span>
                {shortDate(plan.createdAt)} ·{" "}
                {plan.items.map((i: { name: string }) => i.name).join(", ")}
              </span>
              <strong>
                {money(
                  plan.items.reduce(
                    (sum: number, item: { selectedPriceCents: number }) =>
                      sum + item.selectedPriceCents,
                    0,
                  ),
                )}{" "}
                ↗
              </strong>
            </Link>
          ))}
        </section>
      )}
      <p className="notice">
        This beta compares an editable shopping list with our feed. Importing
        retailer carts, automated checkout, coupon testing, and refund claims
        aren’t available yet.
      </p>
    </>
  );
}
