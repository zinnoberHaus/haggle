"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
export function AskAssistant({ query }: { query: string }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [sources, setSources] = useState<{ id: string; title: string }[]>([]);
  async function ask() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await r.json();
      if (r.status === 401) {
        setNeedsSignIn(true);
        return;
      }
      if (!r.ok)
        throw Error(data.error || "Haggle could not answer. Try again.");
      setAnswer(data.answer);
      setSources(data.sources);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <span
        className="eyebrow"
        style={{ display: "flex", gap: 7, alignItems: "center" }}
      >
        <Sparkles size={14} /> A little help from Haggle AI
      </span>
      <h2 style={{ marginTop: 14 }}>Let’s think it through.</h2>
      <p className="muted">
        Get a plain-language comparison using the offers in today’s feed,
        including the catches to check.
      </p>
      {!answer && (
        <button
          className="button"
          onClick={ask}
          disabled={busy || !query}
          style={{ marginTop: 20 }}
        >
          {busy ? "Comparing the current offers…" : "Ask Haggle"}
        </button>
      )}
      {needsSignIn && (
        <p className="notice">
          <Link href={`/sign-in?next=${encodeURIComponent("/ask?q=" + query)}`}>
            Sign in for free AI help
          </Link>
          . Browsing and search are always open.
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error} You can still browse the matching offers below.
        </p>
      )}
      {answer && (
        <>
          <div className="ai-answer">{answer}</div>
          <p className="small-text muted" style={{ marginTop: 20 }}>
            AI can make mistakes. Confirm the price and terms at the source
            before buying.
          </p>
          <div className="store-list">
            {sources.map((s) => (
              <Link href={`/deals/${s.id}`} key={s.id}>
                {s.title} ↗
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
