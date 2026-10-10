import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSavings } from "@/lib/user-data";
import { MyNav } from "@/components/my-nav";
import { money, shortDate } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Savings() {
  const user = await getCurrentUser();
  const ledger = user
    ? await getSavings(user.id)
    : { entries: [], totalSavedCents: 0, totalFeeCents: 0 };
  return (
    <>
      <MyNav />
      <h1 className="page-title">Every dollar, accounted for.</h1>
      <p className="page-intro">
        Real savings belong here. Looking at a deal isn’t the same as saving
        money.
      </p>
      <div className="grid-three">
        {[
          ["Verified savings", ledger.totalSavedCents],
          ["Haggle fees", ledger.totalFeeCents],
          ["You kept", ledger.totalSavedCents - ledger.totalFeeCents],
        ].map(([label, value]) => (
          <div className="panel" key={label}>
            <p className="muted">{label}</p>
            <div className="savings-number">{money(Number(value))}</div>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Your savings history</h2>
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
              Haggle hasn’t recorded any completed savings or charged any fees.
              Cart comparisons are estimates until a purchase is confirmed.
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
