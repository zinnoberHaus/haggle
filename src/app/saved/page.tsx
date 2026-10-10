import Link from "next/link";
import { TargetAlerts } from "@/components/target-alerts";
import { getCurrentUser } from "@/lib/auth";
import { listSavedDeals } from "@/lib/user-data";
import { getDeal } from "@/lib/deals";
import { DealCard } from "@/components/deal-card";
import { MyNav } from "@/components/my-nav";
import { AlertForm } from "@/components/alert-form";
import { SaveButton } from "@/components/save-button";
import { money } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Saved() {
  const user = await getCurrentUser();
  const saved = user ? await listSavedDeals(user.id) : [];
  const rows = await Promise.all(
    saved.map(async (s) => ({ saved: s, deal: await getDeal(s.offerId) })),
  );
  return (
    <>
      <MyNav />
      <span className="eyebrow">My Haggle</span>
      <h1 className="page-title">The ones you’re keeping an eye on.</h1>
      <p className="page-intro">
        A little space for your good finds. Save a target and see when a
        collected price meets it.
      </p>
      {user && <TargetAlerts />}
      {!user ? (
        <div className="empty-state">
          <h3>Good finds deserve a place to stay.</h3>
          <p>Create a free account to keep your saved deals across devices.</p>
          <Link className="button" href="/sign-up?next=/saved">
            Create an account
          </Link>{" "}
          <Link href="/sign-in?next=/saved">Sign in</Link>
        </div>
      ) : !rows.length ? (
        <div className="empty-state">
          <h3>Your next good find is out there.</h3>
          <p>Tap Save on any deal and it will be waiting here.</p>
          <Link className="button" href="/">
            Explore the deals
          </Link>
        </div>
      ) : (
        <div className="grid-two">
          {rows.map(({ deal, saved: s }) => (
            <section className="panel" key={s.offerId}>
              {deal ? (
                <>
                  <DealCard deal={deal} variant="row" />
                  {s.targetPriceCents && (
                    <p className="notice">
                      {deal.priceCents !== null &&
                      deal.priceCents <= s.targetPriceCents
                        ? "At your target price"
                        : "Keeping an eye on it"}{" "}
                      · Target {money(s.targetPriceCents)}
                    </p>
                  )}
                  <AlertForm
                    offerId={s.offerId}
                    priceCents={s.targetPriceCents ?? deal.priceCents}
                    existingTarget={s.targetPriceCents !== null}
                  />
                </>
              ) : (
                <>
                  <h2>This offer is no longer in the feed.</h2>
                  <SaveButton offerId={s.offerId} initialSaved />
                </>
              )}
            </section>
          ))}
        </div>
      )}
      <p className="notice">
        Price checks follow the source feed, so some offers may disappear before
        the price changes. Email alerts are not enabled in this beta.
      </p>
    </>
  );
}
