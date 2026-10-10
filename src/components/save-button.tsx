"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Check } from "lucide-react";
import { useSaved } from "./saved-provider";
export function SaveButton({
  offerId,
  initialSaved = false,
}: {
  offerId: string;
  initialSaved?: boolean;
}) {
  const state = useSaved();
  const saved = state.ready ? state.ids.has(offerId) : initialSaved;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/me/saved", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      if (res.status === 401) {
        location.href =
          "/sign-in?next=" +
          encodeURIComponent(location.pathname + location.search);
        return;
      }
      if (!res.ok) throw Error("Could not update your saved deals. Try again.");
      state.setSaved(offerId, !saved);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="save-control">
      <button
        className={`save-button ${saved ? "saved" : ""}`}
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
      >
        {saved ? <Check size={14} /> : <Bookmark size={14} />}{" "}
        {busy ? "Saving…" : saved ? "Saved" : "Save"}
      </button>
      {error && (
        <span role="alert" className="error-text">
          {error}
        </span>
      )}
    </span>
  );
}
