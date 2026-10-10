"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="content-narrow empty-state">
      <h1 className="page-title">We couldn’t load this page.</h1>
      <p>Please try again. Your saved deals are still in your account.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
