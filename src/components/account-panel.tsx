"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type User = { name: string; email: string; emailVerified: boolean };
type Preferences = { emailAlerts: boolean; weeklyDigest: boolean };
export function AccountPanel({
  user,
  initialPreferences,
  operator = false,
}: {
  user: User;
  initialPreferences: Preferences;
  operator?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verified, setVerified] = useState(user.emailVerified);

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setMessage("");
    setError("");
    try {
      await action();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Please try again in a moment.",
      );
    } finally {
      setBusy("");
    }
  }
  function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("profile", async () => {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message);
      setMessage("Your name has been updated.");
      router.refresh();
    });
  }
  function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("preferences", async () => {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save your preferences.");
      setMessage("Your preferences have been saved.");
    });
  }
  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run("password", async () => {
      const result = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword: String(data.get("newPassword")),
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      form.reset();
      setMessage("Password changed. Your other sessions have been signed out.");
    });
  }
  function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = String(new FormData(event.currentTarget).get("otp"));
    void run("verify", async () => {
      const result = await authClient.emailOtp.verifyEmail({
        email: user.email,
        otp,
      });
      if (result.error) throw new Error(result.error.message);
      setVerified(true);
      setMessage("Your email is verified.");
      router.refresh();
    });
  }

  return (
    <div style={{ maxWidth: 820, margin: "40px auto 64px" }}>
      <p className="eyebrow">MADE FOR YOU</p>
      <h1 className="page-title">Your little corner of Haggle.</h1>
      <p className="muted">Your details, your preferences, your control.</p>
      <div aria-live="polite" style={{ minHeight: 32, marginTop: 20 }}>
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" style={{ color: "#a13220" }}>
            {error}
          </p>
        )}
      </div>
      <div style={{ display: "grid", gap: 20 }}>
        <section className="panel" style={{ padding: 28 }}>
          <h2>About you</h2>
          <form
            onSubmit={saveName}
            style={{ display: "grid", gap: 16, marginTop: 20 }}
          >
            <label className="field">
              Name
              <input
                autoComplete="name"
                value={name}
                required
                minLength={1}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div>
              <p style={{ margin: "0 0 6px" }}>Email address</p>
              <strong>{user.email}</strong>
              <span className="muted">
                {" "}
                · {verified ? "Verified" : "Not verified yet"}
              </span>
            </div>
            <button
              className="button"
              disabled={!!busy}
              style={{ justifySelf: "start" }}
            >
              {busy === "profile" ? "Saving…" : "Save name"}
            </button>
          </form>
          {!verified && (
            <div
              style={{
                borderTop: "1px solid var(--border, #e5dfd5)",
                marginTop: 24,
                paddingTop: 20,
              }}
            >
              {verificationSent ? (
                <form onSubmit={verify} style={{ display: "grid", gap: 12 }}>
                  <label className="field">
                    Code from your email
                    <input
                      name="otp"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      minLength={6}
                      maxLength={8}
                      required
                    />
                  </label>
                  <button className="button secondary" disabled={!!busy}>
                    Verify email
                  </button>
                </form>
              ) : (
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run("verify", async () => {
                      const result =
                        await authClient.emailOtp.sendVerificationOtp({
                          email: user.email,
                          type: "email-verification",
                        });
                      if (result.error) throw new Error(result.error.message);
                      setVerificationSent(true);
                      setMessage("Check your inbox for a verification code.");
                    })
                  }
                >
                  Verify your email
                </button>
              )}
            </div>
          )}
        </section>
        <section className="panel" style={{ padding: 28 }}>
          <h2>Keep me in the loop</h2>
          <p className="muted">
            Save your choices for future email alerts. Delivery is not active
            yet; your saved deals are always available in your watchlist.
          </p>
          <form
            onSubmit={savePreferences}
            style={{ display: "grid", gap: 20, marginTop: 20 }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                checked={preferences.emailAlerts}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    emailAlerts: event.target.checked,
                  })
                }
              />
              Email me when a watched price drops
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="checkbox"
                checked={preferences.weeklyDigest}
                onChange={(event) =>
                  setPreferences({
                    ...preferences,
                    weeklyDigest: event.target.checked,
                  })
                }
              />
              Send a weekly roundup of good finds
            </label>
            <button
              className="button secondary"
              disabled={!!busy}
              style={{ justifySelf: "start" }}
            >
              {busy === "preferences" ? "Saving…" : "Save preferences"}
            </button>
          </form>
        </section>
        <section className="panel" style={{ padding: 28 }}>
          <h2>Password & security</h2>
          <form
            onSubmit={changePassword}
            style={{ display: "grid", gap: 16, marginTop: 20 }}
          >
            <label className="field">
              Current password
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                aria-describedby="new-password-help"
              />
              <small id="new-password-help" className="muted">
                At least 12 characters. Changing it signs out your other
                sessions.
              </small>
            </div>
            <button
              className="button secondary"
              disabled={!!busy}
              style={{ justifySelf: "start" }}
            >
              {busy === "password" ? "Updating…" : "Change password"}
            </button>
          </form>
          <p style={{ marginTop: 20 }}>
            <Link href="/reset-password">Forgot your current password?</Link>
          </p>
        </section>
        <section className="panel" style={{ padding: 28 }}>
          <h2>Your data, on your terms</h2>
          <p className="muted">
            Download your profile, saved deals, preferences and savings history.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 20,
            }}
          >
            <a href="/api/me/export" className="button secondary">
              Export my data
            </a>
            {operator && (
              <Link href="/account/admin" className="button secondary">
                User management
              </Link>
            )}
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() =>
                void run("sessions", async () => {
                  const result = await authClient.revokeOtherSessions();
                  if (result.error) throw new Error(result.error.message);
                  setMessage("Your other sessions have been signed out.");
                })
              }
            >
              Sign out other devices
            </button>
            <button
              className="button"
              disabled={!!busy}
              onClick={() =>
                void run("sign-out", async () => {
                  const result = await authClient.signOut();
                  if (result.error) throw new Error(result.error.message);
                  router.push("/");
                  router.refresh();
                })
              }
            >
              {busy === "sign-out" ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
