import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, isOperator } from "@/lib/auth";
import { sql } from "@/lib/db";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "User management · Haggle",
  robots: { index: false, follow: false },
};
export default async function AdminUsers() {
  const current = await getCurrentUser();
  if (!current) redirect("/sign-in?next=/account/admin");
  if (!isOperator(current.id)) notFound();
  const users =
    await sql`SELECT u.id, u.name, u.email, u."emailVerified" AS "emailVerified", u.role, u.banned, u."createdAt" AS "createdAt",
    (SELECT count(*)::int FROM saved_deals s WHERE s.user_id = u.id) AS "savedDeals"
    FROM neon_auth."user" u ORDER BY u."createdAt" DESC LIMIT 100`;
  return (
    <section style={{ margin: "40px auto 80px" }}>
      <p className="eyebrow">HAGGLE OPERATIONS</p>
      <h1 className="page-title">User management</h1>
      <p className="muted">
        The 100 most recently joined accounts. Manage identity roles,
        restrictions and account removal in the managed authentication console.
      </p>
      <div style={{ display: "flex", gap: 16, margin: "24px 0" }}>
        <a
          href="https://console.neon.tech"
          className="button"
          target="_blank"
          rel="noreferrer"
        >
          Open Neon console
        </a>
        <Link href="/account" className="button secondary">
          Your account
        </Link>
      </div>
      <div className="panel" style={{ overflowX: "auto", padding: 20 }}>
        <table
          style={{
            width: "100%",
            textAlign: "left",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              {[
                "Account",
                "Email",
                "Role",
                "Status",
                "Saved deals",
                "Joined",
              ].map((label) => (
                <th
                  key={label}
                  style={{ padding: 12, borderBottom: "1px solid #ddd6c8" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={String(user.id)}>
                <td style={{ padding: 12 }}>{String(user.name)}</td>
                <td style={{ padding: 12 }}>
                  {String(user.email)}
                  {user.emailVerified ? " ✓" : ""}
                </td>
                <td style={{ padding: 12 }}>{String(user.role || "user")}</td>
                <td style={{ padding: 12 }}>
                  {user.banned ? "Restricted" : "Active"}
                </td>
                <td style={{ padding: 12 }}>{Number(user.savedDeals)}</td>
                <td style={{ padding: 12 }}>
                  {new Date(String(user.createdAt)).toLocaleDateString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length && <p className="muted">No accounts have joined yet.</p>}
      </div>
    </section>
  );
}
