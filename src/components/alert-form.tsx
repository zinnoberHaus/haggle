"use client";
import { useState, useId } from "react";
import { useSaved } from "./saved-provider";
import { useRouter } from "next/navigation";
export function AlertForm({
  offerId,
  priceCents,
  existingTarget = false,
}: {
  offerId: string;
  priceCents: number | null;
  existingTarget?: boolean;
}) {
  const inputId = useId();
  const saved = useSaved();
  const router = useRouter();
  const [target, setTarget] = useState(
    priceCents
      ? String(Math.floor(priceCents * (existingTarget ? 1 : 0.9)) / 100)
      : "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="save-alert-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await fetch("/api/me/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offerId,
              targetPriceCents: Math.round(Number(target) * 100),
            }),
          });
          if (res.status === 401) {
            location.href =
              "/sign-in?next=" + encodeURIComponent(location.pathname);
            return;
          }
          if (!res.ok)
            throw Error("Could not save your target. Please try again.");
          saved.setSaved(offerId, true);
          router.refresh();
          setMessage("Target saved. Check My Haggle for price matches.");
        } catch (err) {
          setMessage((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={inputId}>Your target $</label>
      <input
        id={inputId}
        type="number"
        min="0.01"
        step="0.01"
        max="1000000"
        required
        value={target}
        onChange={(e) => setTarget(e.target.value)}
      />
      <button className="button secondary" disabled={busy}>
        Save target
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
