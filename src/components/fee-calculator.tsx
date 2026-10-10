"use client";

import { useId, useState } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function FeeCalculator() {
  const [savings, setSavings] = useState(120);
  const inputId = useId();
  const fee = Math.min(Math.round(savings * 10) / 100, 20);

  return (
    <section className="panel" aria-labelledby={`${inputId}-title`}>
      <div className="section-heading">
        <h2 id={`${inputId}-title`}>Do the small print, in big numbers.</h2>
        <span className="tag">Illustrative calculator</span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "2rem",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 260px" }}>
          <label
            htmlFor={inputId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <span>If an agent saves you</span>
            <strong>{usd.format(savings)}</strong>
          </label>
          <input
            id={inputId}
            type="range"
            min="0"
            max="400"
            step="5"
            value={savings}
            onChange={(event) => setSavings(Number(event.target.value))}
            style={{ width: "100%", accentColor: "#F2662F" }}
          />
          <p className="muted" style={{ fontSize: ".85rem" }}>
            10% of savings, up to $20 per task. No savings, no fee.
          </p>
        </div>
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            flex: "1 1 260px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: "#F4F1EA",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <span className="muted">Haggle’s fee</span>
            <strong
              style={{ display: "block", fontSize: "2rem", marginTop: ".4rem" }}
            >
              {usd.format(fee)}
            </strong>
          </div>
          <div
            style={{
              background: "#FCE3D6",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <span>You keep</span>
            <strong
              style={{ display: "block", fontSize: "2rem", marginTop: ".4rem" }}
            >
              {usd.format(savings - fee)}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
