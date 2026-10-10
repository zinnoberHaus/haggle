import { getDeals } from "@/lib/deals";
import { DealCard } from "@/components/deal-card";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Coupons() {
  const deals = (await getDeals()).filter((d) =>
    /coupon|promo code|code |extra \d+%/i.test(d.description + " " + d.title),
  );
  return (
    <>
      <span className="eyebrow">A little extra off</span>
      <h1 className="page-title">Coupons, with the fine print.</h1>
      <p className="page-intro">
        Offers mentioning a coupon or promotion in the publisher’s feed. Open
        the full offer for its code and exclusions; Haggle hasn’t tested these
        at checkout.
      </p>
      {deals.length ? (
        <div className="grid-three">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No coupon offers in the feed right now.</h3>
          <p>Browse the latest deals while we wait for new promotions.</p>
          <Link href="/">See all deals</Link>
        </div>
      )}
    </>
  );
}
