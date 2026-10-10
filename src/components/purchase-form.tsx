"use client";

import { useId, useState, type FormEvent } from "react";
import {
  dollarsToCents,
  purchaseInputSchema,
  type Purchase,
  type PurchaseInput,
  type ObservedPurchaseOffer,
} from "@/lib/purchase-values";

export type PurchasePrefill = {
  cartPlanId: string | null;
  offerId: string | null;
  productName: string;
  merchant: string;
  baselineTotalCents: number | null;
};
const asDollars = (value: number | null) =>
  value === null ? "" : (value / 100).toFixed(2);

export function PurchaseForm({
  purchase,
  prefill,
  offers,
  onSaved,
  onCancel,
}: {
  purchase?: Purchase;
  prefill?: PurchasePrefill;
  offers: ObservedPurchaseOffer[];
  onSaved: (purchase: Purchase) => void;
  onCancel?: () => void;
}) {
  const uid = useId();
  const initial = purchase ?? prefill;
  const [productName, setProductName] = useState(initial?.productName ?? "");
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [offerId, setOfferId] = useState(initial?.offerId ?? "");
  const [purchasedOn, setPurchasedOn] = useState(
    purchase?.purchasedOn ?? new Date().toISOString().slice(0, 10),
  );
  const [paid, setPaid] = useState(
    purchase ? asDollars(purchase.paidTotalCents) : "",
  );
  const [baseline, setBaseline] = useState(
    asDollars(initial?.baselineTotalCents ?? null),
  );
  const [policyUrl, setPolicyUrl] = useState(purchase?.policyUrl ?? "");
  const [deadline, setDeadline] = useState(purchase?.adjustmentDeadline ?? "");
  const [status, setStatus] = useState<PurchaseInput["adjustmentStatus"]>(
    purchase?.adjustmentStatus ?? "draft",
  );
  const [refund, setRefund] = useState(
    purchase?.refundCents ? asDollars(purchase.refundCents) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = purchaseInputSchema.safeParse({
      cartPlanId: initial?.cartPlanId ?? null,
      offerId: offerId || null,
      productName,
      merchant,
      purchasedOn,
      paidTotalCents: dollarsToCents(paid),
      baselineTotalCents: baseline.trim()
        ? (dollarsToCents(baseline) ?? -1)
        : null,
      policyUrl: policyUrl.trim() || null,
      adjustmentDeadline: deadline || null,
      adjustmentStatus: status,
      refundCents: status === "received" ? dollarsToCents(refund) : 0,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message || "Check the amounts and dates.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/me/purchases", {
        method: purchase ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          purchase ? { ...parsed.data, id: purchase.id } : parsed.data,
        ),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save this purchase.");
      onSaved(data.purchase);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
      {prefill && !purchase && (
        <p className="notice">
          Your product and comparison baseline came from the selected offer or
          plan. Enter the actual total from your receipt; a plan is not proof of
          purchase.
        </p>
      )}
      <label className="field">
        Product name
        <input
          required
          minLength={2}
          maxLength={150}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
      </label>
      <div className="grid-two" style={{ gap: 18 }}>
        <label className="field">
          Store you bought from
          <input
            required
            maxLength={100}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="field">
          Purchase date
          <input
            type="date"
            required
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            value={purchasedOn}
            onChange={(e) => setPurchasedOn(e.target.value)}
          />
        </label>
        <label className="field">
          Actual paid total ($)
          <input
            type="number"
            inputMode="decimal"
            required
            min="0.01"
            max="1000000"
            step="0.01"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            aria-describedby={`${uid}-totals`}
          />
        </label>
        <label className="field">
          Comparable total before savings ($, optional)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="1000000"
            step="0.01"
            value={baseline}
            onChange={(e) => setBaseline(e.target.value)}
            aria-describedby={`${uid}-totals`}
          />
        </label>
      </div>
      <p id={`${uid}-totals`} className="small-text muted">
        Use the same items and include shipping and tax in both totals. Leave
        the comparison blank if unknown. Reported savings are the positive
        difference; estimates of future rewards do not count.
      </p>
      <label className="field">
        Offer to keep an eye on (optional)
        <select
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
          style={{ width: "100%", minWidth: 0 }}
        >
          <option value="">No linked offer</option>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.title}
            </option>
          ))}
        </select>
        <small className="muted">
          Choose the same model and seller. Linking an offer does not establish
          refund eligibility.
        </small>
      </label>
      <fieldset
        style={{
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 18,
          minWidth: 0,
          display: "grid",
          gap: 16,
        }}
      >
        <legend style={{ padding: "0 8px", fontWeight: 600 }}>
          Price-adjustment notes · optional
        </legend>
        <p className="small-text muted">
          Keep your own record of the retailer’s policy and your request. Haggle
          does not contact the store or verify eligibility.
        </p>
        <label className="field">
          Retailer policy link
          <input
            type="url"
            maxLength={2000}
            placeholder="https://…"
            value={policyUrl}
            onChange={(e) => setPolicyUrl(e.target.value)}
          />
        </label>
        <div className="grid-two" style={{ gap: 18 }}>
          <label className="field">
            Deadline from the policy (optional)
            <input
              type="date"
              min={purchasedOn || "1900-01-01"}
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
          <label className="field">
            Your request status
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as PurchaseInput["adjustmentStatus"])
              }
            >
              <option value="draft">Draft / not submitted</option>
              <option value="submitted">I submitted a request</option>
              <option value="received">I received a refund</option>
              <option value="rejected">The store declined</option>
            </select>
          </label>
        </div>
        {status === "received" && (
          <label className="field">
            Refund actually received ($)
            <input
              type="number"
              inputMode="decimal"
              required
              min="0.01"
              max={paid || "1000000"}
              step="0.01"
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
            />
            <small className="muted">
              Only include money received for this purchase. It cannot exceed
              your paid total.
            </small>
          </label>
        )}
        {purchase?.refundCents && status !== "received" ? (
          <p className="notice">
            Saving this status will remove the refund amount from your reported
            totals.
          </p>
        ) : null}
      </fieldset>
      <p className="small-text muted">
        This is your record, not retailer verification. Haggle charges no fee.
        Please do not enter payment-card details.
      </p>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : purchase ? "Save changes" : "Record my purchase"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="button secondary"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
