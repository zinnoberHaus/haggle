"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, X, ArrowRight, Check } from "lucide-react";
import type { Deal } from "@/lib/feed-types";
import { money, matchQuery } from "@/lib/format";
type Item = { key: number; name: string; price: string; offerId: string };
export function CartComparison({ deals }: { deals: Deal[] }) {
  const [items, setItems] = useState<Item[]>([
    { key: 1, name: "", price: "", offerId: "" },
  ]);
  const [stage, setStage] = useState<"input" | "compare" | "approved">("input");
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const patch = (key: number, change: Partial<Item>) =>
    setItems(items.map((i) => (i.key === key ? { ...i, ...change } : i)));
  const before = items.reduce(
    (s, i) => s + Math.round(Number(i.price) * 100),
    0,
  );
  const after = items.reduce(
    (s, i) =>
      s +
      (deals.find((d) => d.id === i.offerId)?.priceCents ??
        Math.round(Number(i.price) * 100)),
    0,
  );
  const savings = Math.max(0, before - after);
  async function approve() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/me/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            name: i.name,
            originalPriceCents: Math.round(Number(i.price) * 100),
            offerId: i.offerId || null,
          })),
        }),
      });
      if (r.status === 401) {
        setError(
          "Sign in to save this plan. You can keep comparing without an account.",
        );
        return;
      }
      if (!r.ok) throw Error("Could not save this plan. Try again.");
      const data = await r.json();
      setPlanId(data.id);
      setStage("approved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="account-nav">
        <span className="tag">1 · Your shopping list</span>
        <ArrowRight size={16} />
        <span className="tag">2 · Review alternatives</span>
        <ArrowRight size={16} />
        <span className="tag">3 · Your call</span>
      </div>
      {stage === "input" ? (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            setStage("compare");
          }}
        >
          <h2>What are you thinking of buying?</h2>
          <p className="muted">
            Add the product and the price you’d otherwise pay. We’ll show
            possible alternatives from the collected feed.
          </p>
          {items.map((item, index) => (
            <div key={item.key} className="cart-item">
              <label className="field">
                Product {index + 1}
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  value={item.name}
                  onChange={(e) => patch(item.key, { name: e.target.value })}
                  placeholder="e.g. wireless headphones"
                />
              </label>
              <label className="field">
                Your price ($)
                <input
                  required
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  value={item.price}
                  onChange={(e) => patch(item.key, { price: e.target.value })}
                />
              </label>
              <button
                type="button"
                aria-label={`Remove product ${index + 1}`}
                onClick={() =>
                  setItems(items.filter((i) => i.key !== item.key))
                }
                disabled={items.length === 1}
              >
                <X size={17} />
              </button>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setItems([
                  ...items,
                  { key: Date.now(), name: "", price: "", offerId: "" },
                ])
              }
              disabled={items.length >= 10}
            >
              <Plus size={15} />
              Add an item
            </button>
            <button className="button">
              Find possible savings <ArrowRight size={15} />
            </button>
          </div>
        </form>
      ) : (
        <div className="grid-two">
          <section className="panel">
            <h2>
              {stage === "approved"
                ? "Your shopping plan is saved."
                : "A few possibilities. You decide."}
            </h2>
            <p className="muted">
              These may be different models, sizes, or conditions. Choose a
              replacement only after checking the full offer. Keep your original
              if nothing fits.
            </p>
            {items.map((i) => {
              const choices = deals.filter(
                (d) =>
                  d.priceCents !== null &&
                  d.priceCents < Number(i.price) * 100 &&
                  matchQuery(d.title + " " + d.category, i.name),
              );
              return (
                <div
                  key={i.key}
                  style={{
                    borderTop: "1px solid var(--line)",
                    marginTop: 20,
                    paddingTop: 18,
                  }}
                >
                  <h3>
                    {i.name}{" "}
                    <span className="muted">
                      {money(Number(i.price) * 100)}
                    </span>
                  </h3>
                  {stage === "approved" ? (
                    <p style={{ marginTop: 10 }}>
                      {i.offerId ? (
                        <Link href={`/deals/${i.offerId}`}>
                          See selected offer ↗
                        </Link>
                      ) : (
                        "Keep your original item"
                      )}
                    </p>
                  ) : (
                    <>
                      <label className="field">
                        Your choice
                        <select
                          value={i.offerId}
                          onChange={(e) =>
                            patch(i.key, { offerId: e.target.value })
                          }
                        >
                          <option value="">
                            Keep my original · {money(Number(i.price) * 100)}
                          </option>
                          {choices.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title} · {money(d.priceCents)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {i.offerId && (
                        <Link
                          href={`/deals/${i.offerId}`}
                          target="_blank"
                          style={{ textDecoration: "underline" }}
                        >
                          Check this offer before choosing ↗
                        </Link>
                      )}
                      {!choices.length && (
                        <p className="small-text muted">
                          No lower-priced matching offer in today’s feed. Your
                          original stays on the list.
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </section>
          <section className="panel" style={{ alignSelf: "start" }}>
            <span className="eyebrow">Your comparison</span>
            <h2 style={{ marginTop: 12 }}>A smaller total, if it fits.</h2>
            <div className="receipt-row">
              <span>Original prices you entered</span>
              <strong>{money(before)}</strong>
            </div>
            <div className="receipt-row">
              <span>Selected advertised prices</span>
              <strong>{money(after)}</strong>
            </div>
            <div className="receipt-row">
              <span>Haggle fee during beta</span>
              <strong>$0</strong>
            </div>
            <div className="receipt-row total">
              <span>Potential difference</span>
              <span>{money(savings)}</span>
            </div>
            <p className="notice">
              Estimate only. Shipping, tax, eligibility, and product differences
              can change the result. No coupons or cashback have been assumed.
            </p>
            {stage === "approved" ? (
              <>
                <p style={{ display: "flex", gap: 8 }}>
                  <Check size={17} />
                  Saved to your account. Nothing has been purchased.
                </p>
                <Link
                  className="button"
                  href={`/checkout?plan=${planId}`}
                  style={{ marginTop: 20 }}
                >
                  Open shopping checklist
                </Link>
                <button
                  className="button secondary"
                  onClick={() => setStage("compare")}
                  style={{ marginTop: 10 }}
                >
                  Review again
                </button>
              </>
            ) : (
              <>
                <button className="button" onClick={approve} disabled={busy}>
                  {busy ? "Saving your plan…" : "Approve & save this plan"}
                </button>
                <button
                  className="button secondary"
                  onClick={() => setStage("input")}
                  style={{ margin: "10px 0" }}
                >
                  Edit my list
                </button>
              </>
            )}
            {error && (
              <p role="alert" className="notice">
                {error} <Link href="/sign-in?next=/cart">Sign in</Link>
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
