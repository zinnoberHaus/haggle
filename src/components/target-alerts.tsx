"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { money, shortDate } from "@/lib/format";
type Alert = {
  id: string;
  offerId: string;
  targetPriceCents: number;
  observedPriceCents: number;
  observedAt: string;
  readAt: string | null;
};
export function TargetAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/me/alerts")
      .then(async (r) => (r.ok ? r.json() : { alerts: [] }))
      .then((data) => {
        if (active) setAlerts(data.alerts);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const unread = alerts.filter((a) => !a.readAt);
  if (!unread.length) return null;
  return (
    <section className="panel">
      <h2>A price you were waiting for.</h2>
      <p className="muted">
        These publisher prices met your target when Haggle checked the feed.
        Open the offer to confirm it’s still available.
      </p>
      {unread.map((a) => (
        <div className="receipt-row" key={a.id}>
          <Link href={`/deals/${a.offerId}`}>
            Observed {money(a.observedPriceCents)} · Target{" "}
            {money(a.targetPriceCents)}{" "}
            <span className="muted">· {shortDate(a.observedAt)}</span> ↗
          </Link>
          <button
            className="save-button"
            onClick={async () => {
              try {
                const r = await fetch("/api/me/alerts", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: a.id }),
                });
                if (!r.ok) throw Error("Could not update this notification.");
                setAlerts((prev) =>
                  prev.map((x) =>
                    x.id === a.id
                      ? { ...x, readAt: new Date().toISOString() }
                      : x,
                  ),
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Mark read
          </button>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
