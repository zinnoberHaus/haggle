import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getDeal } from "@/lib/deals";
import { money, shortDate } from "@/lib/format";
import { MyNav } from "@/components/my-nav";
import { z } from "zod";
export const dynamic = "force-dynamic";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const valid = z.uuid().safeParse(plan);
  const user = await getCurrentUser();
  if (!user)
    redirect(
      "/sign-in?next=" +
        encodeURIComponent(
          valid.success ? `/checkout?plan=${valid.data}` : "/checkout",
        ),
    );
  const rows = valid.success
    ? await sql`SELECT * FROM cart_plans WHERE user_id=${user.id} AND id=${valid.data}`
    : await sql`SELECT * FROM cart_plans WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 1`;
  const selected = rows[0];
  const items: selectedItem[] = selected?.items ?? [];
  const enriched = await Promise.all(
    items.map(async (item) => ({
      ...item,
      deal: item.offerId ? await getDeal(item.offerId) : null,
    })),
  );
  return (
    <>
      <MyNav />
      <span className="eyebrow">Checkout companion</span>
      <h1 className="page-title">A last look before you buy.</h1>
      <p className="page-intro">
        Your approved plan, with the source links in one place. You complete
        each purchase directly with the store.
      </p>
      {!selected ? (
        <div className="empty-state">
          <h3>Start with a shopping list.</h3>
          <p>
            Compare your list and approve a plan to build your checkout
            checklist.
          </p>
          <Link href="/cart" className="button">
            Compare my list
          </Link>
        </div>
      ) : (
        <div className="grid-two">
          <section className="panel">
            <h2>Your plan · {shortDate(selected.created_at)}</h2>
            {enriched.map((i, index) => (
              <div className="receipt-row" key={index}>
                <div>
                  <h3>{i.name}</h3>
                  <p className="small-text muted">
                    {i.deal ? i.deal.title : "Keep your original item"}
                  </p>
                  {i.deal && (
                    <p style={{ marginTop: 12 }}>
                      <a
                        href={i.deal.sourceUrl}
                        className="button secondary"
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                      >
                        See offer at {i.deal.sourceName} ↗
                      </a>
                    </p>
                  )}
                </div>
                <strong>{money(i.selectedPriceCents)}</strong>
              </div>
            ))}
            <div className="receipt-row total">
              <span>Planned item total</span>
              <span>
                {money(items.reduce((s, i) => s + i.selectedPriceCents, 0))}
              </span>
            </div>
            <p className="notice">
              Advertised prices only. This is a saved snapshot, not a live
              retailer cart. Haggle fee: $0.
            </p>
          </section>
          <section className="panel" style={{ alignSelf: "start" }}>
            <h2>Keep these four things in mind.</h2>
            <ol className="prose">
              <li>Check the exact model, size, condition, and seller.</li>
              <li>Read coupon exclusions and membership requirements.</li>
              <li>Include shipping and tax in your final comparison.</li>
              <li>Check the return window before you place the order.</li>
            </ol>
            <p className="notice">
              No order has been placed, no card is connected, and no cashback or
              price protection has been activated. Automated checkout is not
              available.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href={`/purchases?plan=${selected.id}`} className="button">
                Record a purchase
              </Link>
              <Link href="/compare" className="button secondary">
                Calculate the final cost
              </Link>
            </div>
            <p className="small-text muted" style={{ marginTop: 14 }}>
              After buying at the store, record what you paid and track a
              possible price adjustment. Purchase records are supplied by you;
              Haggle does not verify receipts.
            </p>
            <Link href="/cart">Compare another list ↗</Link>
          </section>
        </div>
      )}
    </>
  );
}
type selectedItem = {
  name: string;
  originalPriceCents: number;
  selectedPriceCents: number;
  offerId: string | null;
};
