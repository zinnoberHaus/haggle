import "server-only";
import { cookies } from "next/headers";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    sessionDataTtl: 60,
    sameSite: "lax",
  },
});

/** Revalidate with the managed server; never authorize from browser-supplied identity. */
export async function getCurrentUser() {
  // Avoid managed-service calls for public browsing with no session cookie. The
  // cookie name is the canonical name in the pinned Neon Auth SDK. Presence
  // alone grants nothing: every authenticated request is revalidated below.
  if (!(await cookies()).get("__Secure-neon-auth.session_token")?.value)
    return null;
  const { data, error } = await auth.getSession({
    query: { disableCookieCache: "true" },
  });
  if (error || !data?.user || !data.session) return null;
  return data.user;
}

export type CurrentUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

/** All browser mutations must originate on this application, including auth proxy calls. */
export function rejectCrossOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    !origin ||
    origin !== new URL(request.url).origin ||
    (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none")
  ) {
    return Response.json(
      { error: "This request must come from Haggle." },
      { status: 403 },
    );
  }
  return null;
}

/** Exact server-configured user IDs only. An unset allowlist grants no operator access. */
export function isOperator(userId: string) {
  return (process.env.HAGGLE_ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .includes(userId);
}
