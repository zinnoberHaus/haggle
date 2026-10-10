"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up" | "reset-password";
function safeDestination(value?: string) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u001f\u007f]/.test(value)
    ? value
    : "/account";
}
export function AuthForm({
  mode,
  next,
  token,
  initialError,
}: {
  mode: Mode;
  next?: string;
  token?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    initialError ? "That reset link has expired. Request a new one below." : "",
  );
  const [message, setMessage] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [email, setEmail] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const destination = safeDestination(next);
  const title = verifyEmail
    ? "Check your inbox"
    : mode === "sign-up"
      ? "A little smarter. A lot saved."
      : mode === "sign-in"
        ? "Welcome back."
        : token && !initialError
          ? "Choose a new password"
          : "Let’s get you back in.";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      if (verifyEmail) {
        const result = await authClient.emailOtp.verifyEmail({
          email: verifyEmail,
          otp: String(data.get("code")),
        });
        if (result.error)
          throw new Error(
            result.error.message || "That code could not be verified.",
          );
        const session = await authClient.getSession();
        if (session.error)
          throw new Error(
            session.error.status === 429
              ? "A few too many requests. Wait a minute, then sign in again."
              : "Your session could not be checked. Please try signing in again.",
          );
        if (session.data?.user) {
          router.push(destination);
          router.refresh();
        } else {
          setVerifyEmail("");
          setMessage("Email verified. You can sign in now.");
          router.push("/sign-in");
        }
      } else if (mode === "reset-password") {
        if (token && !initialError) {
          const result = await authClient.resetPassword({
            token,
            newPassword: String(data.get("password")),
          });
          if (result.error)
            throw new Error(
              result.error.message || "Your password could not be reset.",
            );
          setResetComplete(true);
          setMessage(
            "Your password has been changed. You can sign in with it now.",
          );
        } else {
          const result = await authClient.requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (result.error)
            throw new Error(
              result.error.message || "The reset email could not be requested.",
            );
          setMessage(
            "If this email has an account, a reset link is on its way. Check your inbox and spam folder.",
          );
        }
      } else {
        const credentials = {
          email: email.trim(),
          password: String(data.get("password")),
        };
        const result =
          mode === "sign-up"
            ? await authClient.signUp.email({
                ...credentials,
                name: String(data.get("name")).trim(),
                callbackURL: `${window.location.origin}${destination}`,
              })
            : await authClient.signIn.email(credentials);
        if (result.error) {
          if (result.error.code === "EMAIL_NOT_VERIFIED") {
            const sent = await authClient.emailOtp.sendVerificationOtp({
              email,
              type: "email-verification",
            });
            if (sent.error)
              throw new Error(
                sent.error.message || "Unable to send a verification code.",
              );
            setVerifyEmail(email);
            return;
          }
          throw new Error(
            result.error.message ||
              "We could not sign you in. Please try again.",
          );
        }
        const session = await authClient.getSession();
        if (session.error)
          throw new Error(
            session.error.status === 429
              ? "A few too many requests. Wait a minute, then sign in again."
              : "Your session could not be checked. Please try signing in again.",
          );
        if (session.data?.user) {
          router.push(destination);
          router.refresh();
        } else if (mode === "sign-up") {
          const sent = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
          });
          if (sent.error)
            throw new Error(
              sent.error.message || "Unable to send a verification code.",
            );
          setVerifyEmail(email);
        } else
          throw new Error(
            "Your session could not be restored. Please try signing in again.",
          );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: verifyEmail,
        type: "email-verification",
      });
      if (result.error) throw new Error(result.error.message);
      setMessage("A fresh code is on its way.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not send the code.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="panel auth-panel"
      style={{
        maxWidth: 480,
        margin: "64px auto",
        padding: "clamp(24px, 5vw, 40px)",
      }}
    >
      <p className="eyebrow">YOUR HAGGLE</p>
      <h1 className="page-title" style={{ fontSize: 36 }}>
        {title}
      </h1>
      <p className="muted" style={{ marginBottom: 28 }}>
        {verifyEmail
          ? `Enter the verification code sent to ${verifyEmail}.`
          : mode === "sign-up"
            ? "Save deals and keep your watchlist with you. Browsing is always free."
            : mode === "sign-in"
              ? "Your next good find is waiting."
              : "A fresh start for your Haggle account."}
      </p>
      {!resetComplete && (
        <form onSubmit={submit} style={{ display: "grid", gap: 18 }}>
          {verifyEmail ? (
            <label className="field">
              Verification code
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={8}
              />
            </label>
          ) : (
            <>
              {mode === "sign-up" && (
                <label className="field">
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={80}
                    placeholder="How should we call you?"
                  />
                </label>
              )}
              {!(mode === "reset-password" && token && !initialError) && (
                <label className="field">
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {(mode !== "reset-password" || (token && !initialError)) && (
                <div className="field">
                  <label htmlFor="password">
                    {mode === "reset-password" ? "New password" : "Password"}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "sign-in" ? 1 : 12}
                    maxLength={128}
                    aria-describedby={
                      mode === "sign-in" ? undefined : "password-help"
                    }
                  />
                  {mode !== "sign-in" && (
                    <small id="password-help" className="muted">
                      At least 12 characters. A few memorable words work well.
                    </small>
                  )}
                </div>
              )}
            </>
          )}
          {error && (
            <p role="alert" style={{ color: "#a13220", margin: 0 }}>
              {error}
            </p>
          )}
          {message && (
            <p role="status" style={{ margin: 0 }}>
              {message}
            </p>
          )}
          <button className="button" disabled={pending}>
            {pending
              ? "Just a moment…"
              : verifyEmail
                ? "Verify email"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create free account"
                    : token && !initialError
                      ? "Save new password"
                      : "Send reset link"}
          </button>
        </form>
      )}
      {resetComplete && (
        <>
          <p role="status">{message}</p>
          <Link className="button" href="/sign-in">
            Back to sign in
          </Link>
        </>
      )}
      {verifyEmail && (
        <button
          className="button secondary"
          style={{ marginTop: 16 }}
          disabled={pending}
          onClick={resend}
        >
          Send another code
        </button>
      )}
      {mode === "sign-in" && (
        <p style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/reset-password">Forgot your password?</Link>
        </p>
      )}
      {mode !== "reset-password" && (
        <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
          {mode === "sign-in"
            ? "New around here? "
            : "Already have an account? "}
          <Link
            href={
              mode === "sign-in"
                ? `/sign-up?next=${encodeURIComponent(destination)}`
                : `/sign-in?next=${encodeURIComponent(destination)}`
            }
          >
            {mode === "sign-in" ? "Join Haggle" : "Sign in"}
          </Link>
        </p>
      )}
      <p
        className="muted"
        style={{ textAlign: "center", fontSize: 12, marginTop: 24 }}
      >
        By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </section>
  );
}
