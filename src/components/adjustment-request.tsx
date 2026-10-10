"use client";

import { useId, useState } from "react";
import {
  buildAdjustmentRequest,
  type Purchase,
  type ObservedPurchaseOffer,
} from "@/lib/purchase-values";
import { money, shortDate } from "@/lib/format";

export function AdjustmentRequest({
  purchase,
  offer,
  userName,
}: {
  purchase: Purchase;
  offer: ObservedPurchaseOffer | null;
  userName: string;
}) {
  const uid = useId();
  const [message, setMessage] = useState("");
  const text = buildAdjustmentRequest(purchase, offer, userName);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(
        "Draft copied. Add your order number and check the policy before sending it yourself.",
      );
    } catch {
      setMessage(
        "Copy is unavailable in this browser. Select the draft below or download it.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "haggle-price-adjustment-draft.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Draft downloaded. Nothing has been sent to the retailer.");
  }
  const comparison =
    offer?.priceCents !== null && offer?.priceCents !== undefined
      ? purchase.paidTotalCents - offer.priceCents
      : null;
  return (
    <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
      {offer ? (
        <div className="notice">
          <p>
            <strong>
              {offer.status === "active"
                ? "Current collected offer"
                : "Last observed offer"}
            </strong>{" "}
            · {offer.priceType === "from" ? "From " : ""}
            {money(offer.priceCents)}
          </p>
          <p>{offer.title}</p>
          <p className="small-text">
            Retrieved {shortDate(offer.fetchedAt)}.{" "}
            {offer.status !== "active" && "This offer is no longer current. "}
            <a
              href={offer.sourceUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              style={{ textDecoration: "underline" }}
            >
              From {offer.sourceName} ↗
            </a>
          </p>
          {comparison !== null && (
            <p className="small-text">
              Your recorded total is {money(Math.abs(comparison))}{" "}
              {comparison >= 0 ? "above" : "below"} this advertised item price.
              This compares a paid total with an item price; shipping, tax,
              quantity, seller and conditions may differ. It is not an eligible
              refund amount.
            </p>
          )}
        </div>
      ) : (
        <p className="notice">
          No linked price observation. You can still prepare a request using
          your receipt and the retailer’s policy.
        </p>
      )}
      {purchase.policyUrl && (
        <p className="small-text">
          <a
            href={purchase.policyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", overflowWrap: "anywhere" }}
          >
            Open the policy link you saved ↗
          </a>
        </p>
      )}
      {purchase.adjustmentDeadline && (
        <p className="small-text muted">
          Your recorded deadline: {purchase.adjustmentDeadline}.{" "}
          {purchase.adjustmentDeadline < new Date().toISOString().slice(0, 10)
            ? "This date has passed. "
            : ""}
          Confirm the deadline and exclusions with the store.
        </p>
      )}
      <label className="field" htmlFor={`${uid}-draft`}>
        Request draft · review before sending
        <textarea
          id={`${uid}-draft`}
          value={text}
          readOnly
          rows={13}
          style={{ resize: "vertical", lineHeight: 1.5 }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="button" className="button secondary" onClick={copy}>
          Copy request
        </button>
        <button type="button" className="button secondary" onClick={download}>
          Download draft
        </button>
      </div>
      <p className="small-text muted">
        Add the order number yourself before sending. Haggle does not send this
        request, verify the policy, promise a refund, or charge a fee. Mark the
        outcome using Edit purchase & status.
      </p>
      <p aria-live="polite" className="small-text">
        {message}
      </p>
    </div>
  );
}
