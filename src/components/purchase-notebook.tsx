"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PurchaseForm, type PurchasePrefill } from "@/components/purchase-form";
import { AdjustmentRequest } from "@/components/adjustment-request";
import {
  summarizePurchases,
  type Purchase,
  type ObservedPurchaseOffer,
} from "@/lib/purchase-values";
import { money } from "@/lib/format";

const statusLabels = {
  draft: "Draft / not submitted",
  submitted: "You marked submitted",
  received: "You reported a refund",
  rejected: "You marked declined",
};

function PurchaseCard({
  purchase,
  offers,
  userName,
  onSaved,
  onDeleted,
}: {
  purchase: Purchase;
  offers: ObservedPurchaseOffer[];
  userName: string;
  onSaved: (purchase: Purchase) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/me/purchases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: purchase.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not delete this purchase.");
      onDeleted(purchase.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel" style={{ minWidth: 0 }}>
      <div
        className="section-heading"
        style={{ alignItems: "start", flexWrap: "wrap" }}
      >
        <div style={{ minWidth: 0 }}>
          <span className="eyebrow">
            {purchase.merchant} · {purchase.purchasedOn}
          </span>
          <h2 style={{ marginTop: 10, overflowWrap: "anywhere" }}>
            {purchase.productName}
          </h2>
        </div>
        <span className="tag">User-reported</span>
      </div>
      {editing ? (
        <PurchaseForm
          purchase={purchase}
          offers={offers}
          onSaved={(value) => {
            onSaved(value);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="receipt-row">
            <span>You paid</span>
            <strong>{money(purchase.paidTotalCents)}</strong>
          </div>
          <div className="receipt-row">
            <span>Your comparable baseline</span>
            <span>
              {purchase.baselineTotalCents === null
                ? "Not entered"
                : money(purchase.baselineTotalCents)}
            </span>
          </div>
          <div className="receipt-row">
            <span>Reported purchase savings</span>
            <strong>{money(purchase.reportedSavingsCents)}</strong>
          </div>
          <div className="receipt-row">
            <span>Refund you reported receiving</span>
            <strong>{money(purchase.refundCents)}</strong>
          </div>
          <p className="small-text muted" style={{ marginTop: 14 }}>
            {statusLabels[purchase.adjustmentStatus]} · Haggle fee $0
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              className="button secondary"
              onClick={() => setEditing(true)}
            >
              Edit purchase & status
            </button>
            {purchase.cartPlanId && (
              <Link
                className="button secondary"
                href={`/checkout?plan=${purchase.cartPlanId}`}
              >
                View shopping plan
              </Link>
            )}
            <button
              type="button"
              className="button secondary"
              onClick={() => setConfirmDelete(true)}
            >
              Delete record
            </button>
          </div>
          {confirmDelete && (
            <div className="notice">
              <p>
                Delete this purchase and its reported savings/refund? This does
                not cancel a retailer order or request.
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy ? "Deleting…" : "Delete this record"}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep record
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          <details style={{ marginTop: 22 }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Prepare a price-adjustment request
            </summary>
            <AdjustmentRequest
              purchase={purchase}
              offer={
                offers.find((offer) => offer.id === purchase.offerId) ?? null
              }
              userName={userName}
            />
          </details>
        </>
      )}
    </article>
  );
}

export function PurchaseNotebook({
  initialPurchases,
  offers,
  prefills,
  userName,
}: {
  initialPurchases: Purchase[];
  offers: ObservedPurchaseOffer[];
  prefills: PurchasePrefill[];
  userName: string;
}) {
  const router = useRouter();
  const [purchases, setPurchases] = useState(initialPurchases);
  const [choice, setChoice] = useState("0");
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState("");
  const totals = summarizePurchases(purchases);
  function saved(purchase: Purchase) {
    setPurchases((current) =>
      [purchase, ...current.filter((item) => item.id !== purchase.id)].sort(
        (a, b) => b.purchasedOn.localeCompare(a.purchasedOn),
      ),
    );
    setMessage(
      "Your purchase record is saved. These amounts are user-reported; no retailer action was taken.",
    );
    router.refresh();
  }
  return (
    <>
      <div className="grid-three">
        <section className="panel">
          <p className="muted">Reported purchase savings</p>
          <div className="savings-number">
            {money(totals.reportedSavingsCents)}
          </div>
        </section>
        <section className="panel">
          <p className="muted">Refunds you reported receiving</p>
          <div className="savings-number">
            {money(totals.receivedRefundCents)}
          </div>
        </section>
        <section className="panel">
          <p className="muted">Haggle fees</p>
          <div className="savings-number">$0</div>
        </section>
      </div>
      <p className="notice">
        Your entries are separate from verified savings. Purchase savings
        compare the baseline and paid totals you enter; received refunds are
        shown separately. Conditional cashback is not counted.
      </p>
      <p aria-live="polite" className="small-text">
        {message}
      </p>
      <section
        className="panel"
        style={{ maxWidth: 860, margin: "24px auto 36px" }}
      >
        <h2 style={{ marginBottom: 18 }}>Record a purchase you made.</h2>
        {prefills.length > 0 && (
          <label className="field" style={{ marginBottom: 18 }}>
            Start with an item
            <select
              value={choice}
              onChange={(event) => {
                setChoice(event.target.value);
                setFormKey((key) => key + 1);
              }}
            >
              {prefills.map((item, index) => (
                <option key={index} value={String(index)}>
                  {item.productName}
                </option>
              ))}
              <option value="manual">Enter another purchase</option>
            </select>
            <small className="muted">
              Record each purchase explicitly. Changing the item resets the
              unsaved form.
            </small>
          </label>
        )}
        <PurchaseForm
          key={formKey}
          prefill={choice === "manual" ? undefined : prefills[Number(choice)]}
          offers={offers}
          onSaved={(purchase) => {
            saved(purchase);
            setChoice("manual");
            setFormKey((key) => key + 1);
          }}
        />
      </section>
      <div className="section-heading">
        <h2>Your purchase notebook</h2>
        <span className="muted small-text">
          {purchases.length} record{purchases.length === 1 ? "" : "s"}
        </span>
      </div>
      {!purchases.length ? (
        <div className="empty-state">
          <h3>A place for what you actually bought.</h3>
          <p>
            Add your first receipt total above, then keep the policy and any
            adjustment request with it.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              offers={offers}
              userName={userName}
              onSaved={saved}
              onDeleted={(id) => {
                setPurchases((current) =>
                  current.filter((item) => item.id !== id),
                );
                setMessage(
                  "Purchase deleted. Its reported amounts have been removed.",
                );
                router.refresh();
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
