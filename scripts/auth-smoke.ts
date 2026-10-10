/** Integration test against a running Haggle instance. Creates only isolated test identities and removes them afterward. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: ".env.local", quiet: true });
const base = process.env.TEST_BASE_URL || "http://localhost:3002";
const sql = neon(process.env.DATABASE_URL!);
const runId = randomBytes(8).toString("hex");
const password = `Haggle-test-${randomBytes(24).toString("hex")}`;
const emails = [
  `haggle-test-a-${runId}@example.com`,
  `haggle-test-b-${runId}@example.com`,
];
class Client {
  cookies = new Map<string, string>();
  async call(path: string, method = "GET", data?: unknown, origin = base) {
    const response = await fetch(`${base}${path}`, {
      method,
      redirect: "manual",
      headers: {
        Origin: origin,
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const equal = pair.indexOf("=");
      const name = pair.slice(0, equal),
        value = pair.slice(equal + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = {};
    }
    return { status: response.status, data: result, headers: response.headers };
  }
}
async function main() {
  const anonymous = new Client();
  assert.equal(
    (await anonymous.call("/api/me/saved")).status,
    401,
    "Anonymous saved request must fail",
  );
  assert.equal(
    (await anonymous.call("/api/me/profile")).status,
    401,
    "Anonymous profile request must fail",
  );
  assert.equal(
    (await anonymous.call("/api/me/export")).status,
    401,
    "Anonymous export must fail",
  );
  assert.equal(
    (await anonymous.call("/api/me/admin")).status,
    401,
    "Anonymous admin request must fail",
  );
  assert.equal(
    (
      await anonymous.call(
        "/api/auth/sign-in/email",
        "POST",
        { email: emails[0], password },
        "https://evil.example",
      )
    ).status,
    403,
    "Auth CSRF rejected",
  );
  const first = new Client(),
    second = new Client();
  for (const [client, email] of [
    [first, emails[0]],
    [second, emails[1]],
  ] as const) {
    const signup = await client.call("/api/auth/sign-up/email", "POST", {
      email,
      password,
      name: "Haggle integration test",
    });
    assert.equal(
      signup.status,
      200,
      `Sign-up status: ${signup.status}; error code: ${signup.data.code ?? ""}`,
    );
    const session = await client.call("/api/auth/get-session");
    assert.equal(
      session.data.user?.email,
      email,
      "Session restored from cookie",
    );
  }
  console.log("PASS signup and session restoration (two isolated accounts)");
  assert.equal(
    (await first.call("/api/me/admin")).status,
    403,
    "Ordinary accounts must not see other users",
  );
  const changed = await first.call("/api/me/profile", "PATCH", {
    emailAlerts: true,
    weeklyDigest: false,
  });
  assert.equal(changed.status, 200);
  assert.equal(
    (await first.call("/api/me/profile")).data.preferences.emailAlerts,
    true,
  );
  assert.equal(
    (await second.call("/api/me/profile")).data.preferences.emailAlerts,
    false,
    "Preferences must be isolated",
  );
  assert.equal(
    (
      await first.call("/api/me/profile", "PATCH", {
        emailAlerts: true,
        weeklyDigest: false,
        userId: "forged",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await first.call(
        "/api/me/profile",
        "PATCH",
        { emailAlerts: false, weeklyDigest: false },
        "https://evil.example",
      )
    ).status,
    403,
  );
  const savings = await first.call("/api/me/savings");
  assert.equal(savings.status, 200);
  assert.deepEqual(savings.data.entries, []);
  assert.equal(savings.data.totalSavedCents, 0);
  console.log(
    "PASS owner isolation, forged ownership rejected, CSRF and zero savings",
  );
  const offers =
    await sql`SELECT id FROM offers ORDER BY fetched_at DESC LIMIT 1`;
  assert.ok(offers.length, "Ingest at least one offer before saved-deal smoke");
  const offerId = offers[0].id;
  assert.equal(
    (
      await first.call("/api/me/saved", "POST", {
        offerId,
        targetPriceCents: 1234,
      })
    ).status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/saved")).data.saved[0].targetPriceCents,
    1234,
  );
  assert.equal(
    (await first.call("/api/me/saved", "POST", { offerId })).status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/saved")).data.saved[0].targetPriceCents,
    1234,
    "Repeated save must preserve an existing target",
  );
  assert.deepEqual((await second.call("/api/me/saved")).data.saved, []);
  assert.equal(
    (await second.call("/api/me/saved", "DELETE", { offerId })).status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/saved")).data.saved.length,
    1,
    "Other user cannot remove save",
  );
  assert.equal(
    (
      await first.call("/api/me/saved", "POST", {
        offerId,
        targetPriceCents: -100,
      })
    ).status,
    400,
  );
  assert.equal(
    (await first.call("/api/me/saved", "POST", { offerId: "not-a-real-offer" }))
      .status,
    404,
  );
  const exported = await first.call("/api/me/export");
  assert.equal(exported.status, 200);
  assert.equal(exported.data.user.email, emails[0]);
  assert.equal(exported.data.savedDeals.length, 1);
  assert.equal(
    (await first.call("/api/me/saved", "DELETE", { offerId })).status,
    200,
  );
  console.log(
    "PASS saved deal persistence, target validation, cross-user isolation and export",
  );
  assert.equal(
    (
      await first.call("/api/auth/update-user", "POST", {
        name: "Updated test profile",
      })
    ).status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/profile")).data.user.name,
    "Updated test profile",
  );
  const newPassword = `Changed-${password}`;
  assert.equal(
    (
      await first.call("/api/auth/change-password", "POST", {
        currentPassword: password,
        newPassword,
        revokeOtherSessions: true,
      })
    ).status,
    200,
  );
  assert.equal(
    (await first.call("/api/auth/sign-out", "POST", {})).status,
    200,
  );
  assert.equal(
    (await first.call("/api/me/profile")).status,
    401,
    "Signout must end protected access",
  );
  assert.equal(
    (
      await first.call("/api/auth/sign-in/email", "POST", {
        email: emails[0],
        password,
      })
    ).status,
    401,
    "Old password must fail",
  );
  assert.equal(
    (
      await first.call("/api/auth/sign-in/email", "POST", {
        email: emails[0],
        password: newPassword,
      })
    ).status,
    200,
  );
  assert.equal((await first.call("/api/me/profile")).status, 200);
  const reset = await first.call("/api/auth/request-password-reset", "POST", {
    email: emails[0],
    redirectTo: `${base}/reset-password`,
  });
  assert.equal(reset.status, 200, `Password reset request: ${reset.status}`);
  const invalidReset = await anonymous.call(
    "/api/auth/reset-password",
    "POST",
    { token: "invalid-test-token", newPassword: password },
  );
  assert.equal(invalidReset.status, 400, "Invalid reset token rejected");
  const testUsers =
    await sql`SELECT id FROM neon_auth."user" WHERE email = ${emails[0]}`;
  const resetRows =
    await sql`SELECT identifier FROM neon_auth.verification WHERE value = ${testUsers[0].id} AND identifier LIKE 'reset-password:%' ORDER BY "createdAt" DESC LIMIT 1`;
  assert.ok(
    resetRows.length,
    "Managed reset request creates a token for the test account",
  );
  // Test only the generated account's server-issued token. This proves reset semantics,
  // not mailbox delivery; no reset token is printed or persisted outside this process.
  const token = String(resetRows[0].identifier).replace("reset-password:", "");
  assert.equal(
    (
      await anonymous.call("/api/auth/reset-password", "POST", {
        token,
        newPassword: password,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await anonymous.call("/api/auth/reset-password", "POST", {
        token,
        newPassword: password,
      })
    ).status,
    400,
    "Reset token must be one use",
  );
  assert.equal(
    (
      await anonymous.call("/api/auth/sign-in/email", "POST", {
        email: emails[0],
        password,
      })
    ).status,
    200,
  );
  console.log(
    "PASS profile update, password change, signout, credential login, reset request, valid-token reset and replay rejection",
  );
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Auth smoke failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    // Remove only the identities this invocation generated; FK cascades remove their app data.
    await sql`DELETE FROM neon_auth.verification WHERE value IN (SELECT id::text FROM neon_auth."user" WHERE email IN (${emails[0]}, ${emails[1]}))`;
    await sql`DELETE FROM neon_auth."user" WHERE email IN (${emails[0]}, ${emails[1]})`;
    console.log("Removed this run’s test identities and data");
  });
