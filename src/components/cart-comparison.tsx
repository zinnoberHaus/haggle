"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Plus, X, ArrowRight, Check, Sparkles } from "lucide-react";
import type { Deal } from "@/lib/feed-types";
import { money, matchQuery } from "@/lib/format";
type Item = { key: number; name: string; price: string; offerId: string };
type CartReview = {
  fingerprint: string;
  summary: string;
  reviews: { itemIndex: number; advice: string; offerIds: string[] }[];
};
const draftKey = "haggle.cart-draft.v1";
export function CartComparison({ deals }: { deals: Deal[] }) {
  const choiceId = useId();
  const [items, setItems] = useState<Item[]>([
    { key: 1, name: "", price: "", offerId: "" },
  ]);
  const [stage, setStage] = useState<"input" | "compare" | "approved">("input");
  const [error, setError] = useState("");
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<CartReview | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewNeedsSignIn, setReviewNeedsSignIn] = useState(false);
  const reviewVersion = useRef(0);
  const reviewRequest = useRef<AbortController | null>(null);
  const latestItems = useRef(items);
  useEffect(() => {
    latestItems.current = items;
  }, [items]);
  const reviewInput = items.map((item) => ({
    name: item.name.trim(),
    originalPriceCents: Math.round(Number(item.price) * 100),
  }));
  const fingerprint = JSON.stringify(reviewInput);
  const currentReview = review?.fingerprint === fingerprint ? review : null;
  useEffect(
    () => () => {
      reviewVersion.current += 1;
      reviewRequest.current?.abort();
    },
    [],
  );
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft: unknown = JSON.parse(raw);
      if (
        !Array.isArray(draft) ||
        draft.length < 1 ||
        draft.length > 10 ||
        !draft.every(
          (item) =>
            item &&
            typeof item.name === "string" &&
            item.name.trim().length >= 2 &&
            item.name.length <= 150 &&
            typeof item.price === "string" &&
            Number.isFinite(Number(item.price)) &&
            Number(item.price) >= 0.01 &&
            Number(item.price) <= 100000 &&
            typeof item.offerId === "string",
        )
      ) {
        sessionStorage.removeItem(draftKey);
        return;
      }
      setItems(
        draft.map((item, index) => ({
          key: index + 1,
          name: item.name,
          price: item.price,
          offerId: deals.some(
            (deal) => deal.id === item.offerId && deal.priceCents !== null,
          )
            ? item.offerId
            : "",
        })),
      );
      setStage("compare");
    } catch {
      // Storage may be disabled. Comparing without persistence still works.
    }
    // Restore once on arrival; later feed refreshes must not replace edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function invalidateReview() {
    reviewVersion.current += 1;
    reviewRequest.current?.abort();
    reviewRequest.current = null;
    setReview(null);
    setReviewBusy(false);
    setReviewError("");
    setReviewNeedsSignIn(false);
  }
  function patch(key: number, change: Partial<Item>) {
    const previous = items.find((item) => item.key === key);
    const itemChanged =
      (change.name !== undefined && change.name !== previous?.name) ||
      (change.price !== undefined && change.price !== previous?.price);
    if (itemChanged) invalidateReview();
    setItems(
      items.map((i) =>
        i.key === key
          ? { ...i, ...change, ...(itemChanged ? { offerId: "" } : {}) }
          : i,
      ),
    );
  }
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
  async function askForReview() {
    if (reviewBusy) return;
    const version = ++reviewVersion.current;
    reviewRequest.current?.abort();
    const controller = new AbortController();
    reviewRequest.current = controller;
    setReviewBusy(true);
    setReviewError("");
    setReviewNeedsSignIn(false);
    try {
      const response = await fetch("/api/cart-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reviewInput }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (version !== reviewVersion.current || controller.signal.aborted)
        return;
      if (response.status === 401) {
        setReviewNeedsSignIn(true);
        try {
          sessionStorage.setItem(draftKey, JSON.stringify(latestItems.current));
          setReviewError(
            "Sign in for an AI review. Your list and choices are saved for your return.",
          );
        } catch {
          setReviewError(
            "Sign in for an AI review. Your browser blocked draft storage, so copy your list before leaving this page.",
          );
        }
        return;
      }
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : response.status === 429
              ? "You’ve used today’s AI questions. You can still compare and choose offers yourself."
              : "AI review is unavailable right now. Your comparison is still here.",
        );
      if (typeof data.summary !== "string" || !Array.isArray(data.reviews))
        throw new Error("The AI review could not be read. Please try again.");
      const validatedReviews = reviewInput.map((item, itemIndex) => {
        const result = data.reviews.find(
          (entry: unknown) =>
            entry &&
            typeof entry === "object" &&
            "itemIndex" in entry &&
            entry.itemIndex === itemIndex,
        );
        if (
          !result ||
          typeof result.advice !== "string" ||
          !Array.isArray(result.offerIds)
        )
          throw new Error("The AI review was incomplete. Please try again.");
        return {
          itemIndex,
          advice: result.advice,
          offerIds: deals
            .filter(
              (deal) =>
                result.offerIds.includes(deal.id) &&
                deal.status === "active" &&
                deal.priceCents !== null &&
                deal.priceCents < item.originalPriceCents,
            )
            .map((deal) => deal.id),
        };
      });
      setReview({
        fingerprint,
        summary: data.summary,
        reviews: validatedReviews,
      });
    } catch (error) {
      if (version !== reviewVersion.current || controller.signal.aborted)
        return;
      setReviewError(
        error instanceof Error
          ? error.message
          : "AI review is unavailable right now. You can keep comparing.",
      );
    } finally {
      if (version === reviewVersion.current) {
        setReviewBusy(false);
        reviewRequest.current = null;
      }
    }
  }
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
        try {
          sessionStorage.setItem(draftKey, JSON.stringify(items));
        } catch {
          setError(
            "Sign in to save this plan. Your browser blocked draft storage, so copy your list before signing in.",
          );
          return;
        }
        setError(
          "Sign in to save this plan. You can keep comparing without an account.",
        );
        return;
      }
      if (!r.ok) throw Error("Could not save this plan. Try again.");
      const data = await r.json();
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Storage is optional. */
      }
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
          <p className="small-text muted">
            Changing a product or its price clears that item’s selected
            replacement so you can review the choice again.
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
                onClick={() => {
                  invalidateReview();
                  setItems(items.filter((i) => i.key !== item.key));
                }}
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
              onClick={() => {
                invalidateReview();
                setItems([
                  ...items,
                  { key: Date.now(), name: "", price: "", offerId: "" },
                ]);
              }}
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
            {stage === "compare" && (
              <section
                aria-labelledby={`${choiceId}-review-title`}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 18,
                  marginTop: 22,
                }}
              >
                <h3
                  id={`${choiceId}-review-title`}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <Sparkles size={16} /> A second look from Haggle AI
                </h3>
                <p className="small-text muted" style={{ marginTop: 10 }}>
                  Ask AI to review your list against the collected offers and
                  explain possible tradeoffs. You choose every replacement.
                  Shares your 10 daily AI questions; no fee.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={askForReview}
                  disabled={reviewBusy}
                  style={{ marginTop: 14 }}
                >
                  {reviewBusy
                    ? "Reviewing your list…"
                    : currentReview
                      ? "Review my list again"
                      : "Ask AI to review my list"}
                </button>
                <div aria-live="polite">
                  {reviewBusy && (
                    <p className="small-text muted" style={{ marginTop: 12 }}>
                      Comparing the current feed. Your choices stay unchanged.
                    </p>
                  )}
                  {currentReview && (
                    <>
                      <p className="ai-answer" style={{ marginTop: 16 }}>
                        {currentReview.summary}
                      </p>
                      <p className="small-text muted" style={{ marginTop: 12 }}>
                        AI can make mistakes. Check model, size, seller,
                        eligibility and final costs at the source. No coupons
                        have been tested and nothing has been purchased.
                      </p>
                    </>
                  )}
                </div>
                {reviewError && (
                  <p role="alert" className="notice">
                    {reviewError}{" "}
                    {reviewNeedsSignIn && (
                      <Link
                        href="/sign-in?next=/cart"
                        onClick={() => {
                          try {
                            sessionStorage.setItem(
                              draftKey,
                              JSON.stringify(items),
                            );
                          } catch {
                            /* The storage limitation is already visible above. */
                          }
                        }}
                      >
                        Sign in for AI review
                      </Link>
                    )}
                  </p>
                )}
              </section>
            )}
            {items.map((i, itemIndex) => {
              const advice = currentReview?.reviews.find(
                (entry) => entry.itemIndex === itemIndex,
              );
              const choices = deals.filter(
                (d) =>
                  d.priceCents !== null &&
                  (d.id === i.offerId ||
                    (d.priceCents < Number(i.price) * 100 &&
                      (matchQuery(d.title + " " + d.category, i.name) ||
                        advice?.offerIds.includes(d.id)))),
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
                  {advice && (
                    <div className="notice">
                      <span className="eyebrow">AI review</span>
                      <p className="ai-answer" style={{ marginTop: 10 }}>
                        {advice.advice}
                      </p>
                      {advice.offerIds.length > 0 && (
                        <div className="store-list" style={{ marginTop: 12 }}>
                          {advice.offerIds.map((id) => {
                            const source = deals.find(
                              (deal) => deal.id === id,
                            )!;
                            return (
                              <div
                                key={id}
                                style={{
                                  minWidth: 0,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                <Link
                                  href={`/deals/${id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {source.title} ↗
                                </Link>
                                <p
                                  className="small-text"
                                  style={{ marginTop: 5 }}
                                >
                                  Advertised price:{" "}
                                  {source.priceType === "from" ? "from " : ""}
                                  {money(source.priceCents)}
                                </p>
                                <a
                                  href={source.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer sponsored"
                                  className="small-text muted"
                                  style={{ display: "block", marginTop: 5 }}
                                >
                                  From {source.sourceName} ↗
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
                      <div className="field">
                        <label htmlFor={`${choiceId}-${i.key}`}>
                          Your choice
                        </label>
                        <select
                          id={`${choiceId}-${i.key}`}
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
                      </div>
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
