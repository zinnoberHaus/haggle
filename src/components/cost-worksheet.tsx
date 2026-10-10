"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  calculateCost,
  costInputSchema,
  emptyCostInput,
  offerWarnings,
  parseDollarInput,
  type CostInput,
  type OfferSnapshot,
  type SavedComparison,
} from "@/lib/cost-comparison";
import { money } from "@/lib/format";

const amountKeys = [
  "itemPriceCents",
  "couponCents",
  "shippingCents",
  "taxCents",
  "cashbackCents",
  "cardRewardCents",
] as const;
type AmountKey = (typeof amountKeys)[number];
type Draft = Omit<CostInput, AmountKey> & Record<AmountKey, string>;

function draftFrom(input: CostInput): Draft {
  const dollars = (value: number | null) =>
    value === null ? "" : (value / 100).toFixed(2);
  return {
    ...input,
    itemPriceCents: dollars(input.itemPriceCents),
    couponCents: dollars(input.couponCents),
    shippingCents: dollars(input.shippingCents),
    taxCents: dollars(input.taxCents),
    cashbackCents: dollars(input.cashbackCents),
    cardRewardCents: dollars(input.cardRewardCents),
  };
}

function readDraft(draft: Draft): CostInput {
  return costInputSchema.parse({
    ...draft,
    ...Object.fromEntries(
      amountKeys.map((key) => [
        key,
        parseDollarInput(
          key === "couponCents" ||
            key === "cashbackCents" ||
            key === "cardRewardCents"
            ? draft[key] || "0"
            : draft[key],
          key === "shippingCents" || key === "taxCents",
        ),
      ]),
    ),
  });
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = error.issues as { message: string }[];
    return issues[0]?.message ?? "Check the worksheet values.";
  }
  return error instanceof Error ? error.message : "Check the worksheet values.";
}

export function CostWorksheet({
  source: initialSource,
  worksheet,
  comparisons,
  signedIn,
  returnTo,
}: {
  source: OfferSnapshot | null;
  worksheet: SavedComparison | null;
  comparisons: SavedComparison[];
  signedIn: boolean;
  returnTo: string;
}) {
  const [draft, setDraft] = useState(() =>
    draftFrom(worksheet?.input ?? emptyCostInput(initialSource)),
  );
  const [source, setSource] = useState(initialSource);
  const [savedId, setSavedId] = useState<string | null>(worksheet?.id ?? null);
  const [rows, setRows] = useState(comparisons);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const draftKey = `haggle-cost-draft:${worksheet?.id ?? initialSource?.id ?? "new"}`;
  const expectedOfferId = worksheet?.input.offerId ?? initialSource?.id ?? null;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(draftKey);
      if (!stored) return;
      const restored = costInputSchema.safeParse(JSON.parse(stored));
      if (
        restored.success &&
        (!restored.data.offerId || restored.data.offerId === expectedOfferId)
      ) {
        setDraft(draftFrom(restored.data));
        if (!restored.data.offerId) setSource(null);
        setMessage("Your worksheet was restored after sign-in.");
      }
    } catch {
      /* Storage can be unavailable; the public calculator still works. */
    }
  }, [draftKey, expectedOfferId]);

  let input: CostInput | null = null;
  let result: ReturnType<typeof calculateCost> | null = null;
  let calculationError = "";
  try {
    input = readDraft(draft);
    result = calculateCost(input);
  } catch (e) {
    calculationError = errorMessage(e);
  }
  const warnings = input ? offerWarnings(input, source) : [];
  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setMessage("");
    setError("");
  };

  async function save() {
    setError("");
    setMessage("");
    let entered: CostInput;
    try {
      entered = readDraft(draft);
    } catch (e) {
      setError(errorMessage(e));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/me/comparisons", {
        method: savedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          savedId ? { id: savedId, input: entered } : { input: entered },
        ),
      });
      if (response.status === 401) {
        let retained = false;
        try {
          sessionStorage.setItem(draftKey, JSON.stringify(entered));
          retained = true;
        } catch {
          /* Explain if the browser prevents retention. */
        }
        setNeedsSignIn(true);
        setError(
          retained
            ? "Sign in to save. This worksheet will be restored in this tab when you return."
            : "Sign in to save. This browser could not retain your draft; copy your values before leaving.",
        );
        return;
      }
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The worksheet could not be saved.");
      const saved = data.comparison as SavedComparison;
      setSavedId(saved.id);
      setSource(saved.sourceSnapshot);
      setRows((previous) =>
        [saved, ...previous.filter((row) => row.id !== saved.id)].slice(0, 50),
      );
      setNeedsSignIn(false);
      setMessage(
        "Worksheet saved. These are your assumptions, not verified savings.",
      );
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Optional local draft cleanup. */
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/me/comparisons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "The worksheet could not be deleted.");
      setRows((previous) => previous.filter((row) => row.id !== id));
      if (id === savedId) setSavedId(null);
      setMessage(
        "Saved worksheet deleted. The values in the calculator remain editable.",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const amountField = (key: AmountKey, label: string, hint?: string) => (
    <label className="field">
      {label}
      <input
        type="text"
        inputMode="decimal"
        maxLength={10}
        value={draft[key]}
        onChange={(event) => patch(key, event.target.value)}
        placeholder={
          key === "shippingCents" || key === "taxCents" ? "Unknown" : "0.00"
        }
      />
      {hint && <span className="small-text muted">{hint}</span>}
    </label>
  );

  return (
    <>
      <div className="grid-two">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <section className="panel">
            <span className="eyebrow">Your assumptions · USD</span>
            <h2 style={{ marginTop: 10 }}>Start with the item price.</h2>
            {source && (
              <div className="notice">
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  {source.title} · {source.sourceName} ↗
                </a>
                <p>
                  Latest collected price:{" "}
                  {source.priceType === "from" ? "from " : ""}
                  {source.priceCents === null
                    ? "not specified"
                    : money(source.priceCents)}
                  . Collected {source.fetchedAt.replace("T", " ").slice(0, 16)}{" "}
                  UTC.
                </p>
                <p>
                  The advertised price may already include a coupon or
                  membership discount. Check the source terms.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    patch("offerId", null);
                    setSource(null);
                  }}
                >
                  Remove source link
                </button>
              </div>
            )}
            <label className="field">
              Worksheet name
              <input
                value={draft.name}
                maxLength={150}
                onChange={(event) => patch("name", event.target.value)}
                required
              />
            </label>
            {amountField(
              "itemPriceCents",
              "Item price ($)",
              "Use the price for your exact model, quantity and eligibility. Editing this value does not change the source offer.",
            )}
            {amountField(
              "couponCents",
              "Coupon amount ($)",
              "Enter the dollar discount. A coupon already included below is recorded but is not subtracted again.",
            )}
            <label
              style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
            >
              <input
                type="checkbox"
                checked={draft.couponAlreadyIncluded}
                onChange={(event) =>
                  patch("couponAlreadyIncluded", event.target.checked)
                }
              />
              <span>This coupon is already included in the item price.</span>
            </label>
            <p className="small-text muted" style={{ marginTop: 10 }}>
              Uncheck only for an additional coupon you expect to apply at
              checkout. Haggle has not tested it.
            </p>
            <details style={{ marginTop: 16 }}>
              <summary>Coupon code and conditions</summary>
              <label className="field">
                Coupon code (optional)
                <input
                  value={draft.couponCode}
                  maxLength={100}
                  onChange={(event) => patch("couponCode", event.target.value)}
                />
              </label>
              <label className="field">
                Coupon conditions (optional)
                <textarea
                  value={draft.couponNotes}
                  maxLength={600}
                  onChange={(event) => patch("couponNotes", event.target.value)}
                />
              </label>
              <label className="field">
                Coupon source URL (optional)
                <input
                  type="url"
                  value={draft.couponSourceUrl}
                  maxLength={1000}
                  onChange={(event) =>
                    patch("couponSourceUrl", event.target.value)
                  }
                />
              </label>
            </details>
            <div className="grid-two">
              {amountField(
                "shippingCents",
                "Shipping ($)",
                "Leave blank if unknown. Enter 0 only when free shipping applies to you.",
              )}
              {amountField(
                "taxCents",
                "Tax ($)",
                "Leave blank if unknown. Enter your checkout tax estimate when available.",
              )}
            </div>
          </section>
          <section className="panel">
            <span className="eyebrow">Conditional · received later</span>
            <h2 style={{ marginTop: 10 }}>Potential rewards</h2>
            <p className="muted">
              Enter dollar amounts from the terms you checked. Rewards do not
              reduce what you pay today, and may not combine with a coupon or
              with each other.
            </p>
            {amountField("cashbackCents", "Potential cashback ($)")}
            <label className="field">
              Cashback eligibility and timing
              <textarea
                value={draft.cashbackNotes}
                maxLength={600}
                placeholder="Required for a positive amount: portal, exclusions, activation steps and payout timing"
                onChange={(event) => patch("cashbackNotes", event.target.value)}
              />
            </label>
            <label className="field">
              Cashback terms URL
              <input
                type="url"
                value={draft.cashbackSourceUrl}
                maxLength={1000}
                placeholder="https://…"
                onChange={(event) =>
                  patch("cashbackSourceUrl", event.target.value)
                }
              />
            </label>
            {amountField("cardRewardCents", "Potential card reward ($)")}
            <label className="field">
              Card reward eligibility and timing
              <textarea
                value={draft.cardRewardNotes}
                maxLength={600}
                placeholder="Required for a positive amount: eligible card, spending limits, exclusions and timing"
                onChange={(event) =>
                  patch("cardRewardNotes", event.target.value)
                }
              />
            </label>
            <label className="field">
              Card reward terms URL
              <input
                type="url"
                value={draft.cardRewardSourceUrl}
                maxLength={1000}
                placeholder="https://…"
                onChange={(event) =>
                  patch("cardRewardSourceUrl", event.target.value)
                }
              />
            </label>
            <label className="field">
              Other assumptions (optional)
              <textarea
                value={draft.notes}
                maxLength={600}
                placeholder="Membership requirements, quantity, return restrictions…"
                onChange={(event) => patch("notes", event.target.value)}
              />
            </label>
            <button className="button" disabled={busy || !result}>
              {busy
                ? "Working…"
                : savedId
                  ? "Update saved worksheet"
                  : "Save worksheet to my account"}
            </button>
            <p className="small-text muted" style={{ marginTop: 12 }}>
              Calculation is public. Saving is optional and requires an account.
            </p>
          </section>
        </form>
        <aside
          className="panel"
          style={{ alignSelf: "start" }}
          aria-label="Cost estimate"
        >
          <span className="eyebrow">Estimate, not a checkout quote</span>
          <h2 style={{ marginTop: 10 }}>What you pay, and what may return.</h2>
          {calculationError ? (
            <p role="status" className="notice">
              {calculationError}
            </p>
          ) : (
            result && (
              <>
                <div className="receipt-row">
                  <span>Item price</span>
                  <strong>{money(input!.itemPriceCents)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Additional coupon</span>
                  <strong>−{money(result.additionalCouponCents)}</strong>
                </div>
                {input!.couponAlreadyIncluded && input!.couponCents > 0 && (
                  <p className="small-text muted">
                    The {money(input!.couponCents)} coupon is already in the
                    item price and has not been subtracted again.
                  </p>
                )}
                <div className="receipt-row">
                  <span>Shipping</span>
                  <strong>
                    {input!.shippingCents === null
                      ? "Unknown"
                      : money(input!.shippingCents)}
                  </strong>
                </div>
                <div className="receipt-row">
                  <span>Tax</span>
                  <strong>
                    {input!.taxCents === null
                      ? "Unknown"
                      : money(input!.taxCents)}
                  </strong>
                </div>
                <div className="receipt-row total">
                  <span>Estimated pay now</span>
                  <span>
                    {result.payNowCents === null
                      ? "Unknown"
                      : money(result.payNowCents)}
                  </span>
                </div>
                {result.unknownCosts.length > 0 && (
                  <p className="notice">
                    Known subtotal: {money(result.knownSubtotalCents)}, plus
                    unknown {result.unknownCosts.join(" and ")}. No final total
                    is available yet.
                  </p>
                )}
                <div className="receipt-row">
                  <span>Potential cashback later</span>
                  <strong>{money(input!.cashbackCents)}</strong>
                </div>
                <div className="receipt-row">
                  <span>Potential card reward later</span>
                  <strong>{money(input!.cardRewardCents)}</strong>
                </div>
                <div className="receipt-row total">
                  <span>Cost if all rewards are received</span>
                  <span>
                    {result.conditionalNetCents === null
                      ? "Unknown"
                      : money(result.conditionalNetCents)}
                  </span>
                </div>
                <p className="notice">
                  All entered discounts, costs and rewards are your assumptions.
                  Haggle has not verified eligibility, tested coupons, activated
                  rewards or connected a card. Nothing is purchased or charged.
                </p>
              </>
            )
          )}
          {warnings.map((warning) => (
            <p className="notice" key={warning}>
              {warning}
            </p>
          ))}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {needsSignIn && (
            <Link
              className="button secondary"
              href={`/sign-in?next=${encodeURIComponent(returnTo)}`}
            >
              Sign in and return
            </Link>
          )}
        </aside>
      </div>
      <section className="panel">
        <h2>Your saved worksheets</h2>
        <p className="muted">
          Snapshots of your assumptions, separate from the savings ledger.
          Reopen one to check the latest collected source price.
        </p>
        {!signedIn && !rows.length ? (
          <p className="notice">
            Use the calculator freely. Choose “Save worksheet” when you want to
            keep a copy in your account.
          </p>
        ) : !rows.length ? (
          <p className="notice">No saved worksheets yet.</p>
        ) : (
          rows.map((row) => (
            <div
              className="receipt-row"
              key={row.id}
              style={{ gap: 12, flexWrap: "wrap" }}
            >
              <div>
                <Link href={`/compare?worksheet=${row.id}`}>
                  {row.input.name}
                </Link>
                <p className="small-text muted">
                  Estimated pay now:{" "}
                  {row.result.payNowCents === null
                    ? "unknown"
                    : money(row.result.payNowCents)}{" "}
                  · Saved {String(row.updatedAt).slice(0, 10)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Link href={`/compare?worksheet=${row.id}`}>Edit</Link>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Delete ${row.input.name}`}
                  onClick={() => {
                    void remove(row.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
        <p style={{ marginTop: 16 }}>
          <Link
            href="/compare"
            onClick={() => {
              setDraft(draftFrom(emptyCostInput()));
              setSavedId(null);
              setSource(null);
              setMessage("");
              setError("");
              setNeedsSignIn(false);
              try {
                sessionStorage.removeItem(draftKey);
              } catch {
                /* Optional local draft cleanup. */
              }
            }}
          >
            Start a new worksheet ↗
          </Link>
        </p>
      </section>
    </>
  );
}
