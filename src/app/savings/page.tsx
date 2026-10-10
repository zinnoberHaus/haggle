import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSavings } from "@/lib/user-data";
import { getReportedPurchaseSavings } from "@/lib/purchases";
import { MyNav } from "@/components/my-nav";
import { money, shortDate } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Savings() {
  const user = await getCurrentUser();
  const [ledger, reported] = user
    ? await Promise.all([
        getSavings(user.id),
        getReportedPurchaseSavings(user.id),
      ])
    : [
        { entries: [], totalSavedCents: 0, totalFeeCents: 0 },
        {
          purchases: [],
          reportedSavingsCents: 0,
          receivedRefundCents: 0,
          feeCents: 0,
          purchaseCount: 0,
        },
      ];
  return (
    <>
      <MyNav />
      <h1 className="page-title">Every dollar, accounted for.</h1>
      <p className="page-intro">
        Track what you paid and any refunds you received. Your records stay
        separate from savings confirmed by a provider.
      </p>
      <div className="grid-three">
        {[
          ["Purchase savings you reported", reported.reportedSavingsCents],
          ["Refunds you reported receiving", reported.receivedRefundCents],
          ["Haggle fees", ledger.totalFeeCents],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="muted">{label}</p>
            <div className="savings-number">{money(Number(value))}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Your purchase records</h2>
          <Link href={user ? "/purchases" : "/sign-in?next=/purchases"}>
            Record a purchase ↗
          </Link>
        </div>
        <p className="notice">
          User-reported amounts. Purchase savings compare your entered baseline
          with your paid total. Refunds appear only when you mark them received.
          Haggle has not verified these records and charges no fee for them.
        </p>
        {reported.purchases.length ? (
          reported.purchases.slice(0, 10).map((purchase) => (
            <div className="receipt-row" key={purchase.id}>
              <div>
                <Link href="/purchases">{purchase.productName} ↗</Link>
                <p className="small-text muted">
                  {shortDate(purchase.purchasedOn)} · {purchase.merchant} · Paid{" "}
                  {money(purchase.paidTotalCents)}
                </p>
              </div>
              <div>
                <strong>{money(purchase.reportedSavingsCents)}</strong>
                <p className="small-text muted">
                  Reported savings
                  {purchase.adjustmentStatus === "received"
                    ? ` · Refund ${money(purchase.refundCents)}`
                    : ""}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>Start with a purchase you made.</h3>
            <p>
              Record its paid total, compare it with a price you otherwise would
              have paid, and keep track of any price-adjustment request.
            </p>
            <Link
              className="button"
              href={user ? "/purchases" : "/sign-in?next=/purchases"}
            >
              Record a purchase
            </Link>
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Provider-verified history</h2>
        <p className="muted">
          Verified savings {money(ledger.totalSavedCents)} · After fees{" "}
          {money(ledger.totalSavedCents - ledger.totalFeeCents)}
        </p>
        {ledger.entries.length ? (
          ledger.entries.map((e) => (
            <div className="receipt-row" key={e.id}>
              <span>
                {shortDate(e.recordedAt)} · {e.description}
              </span>
              <strong>
                {money(e.savedCents)} <small>Fee {money(e.feeCents)}</small>
              </strong>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>A clean slate.</h3>
            <p>
              No provider-verified savings or fees have been recorded. Shopping
              plans are estimates, and your purchase records above remain
              labeled as user-reported.
            </p>
            <Link href={user ? "/cart" : "/sign-up"} className="button">
              {user ? "Compare a shopping list" : "Create your account"}
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
