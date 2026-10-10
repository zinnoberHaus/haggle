import { isOperator } from "@/lib/auth";
import { sql } from "@/lib/db";
import { authorized, json, unavailable } from "@/lib/user-data";
export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    if (!isOperator(access.user.id))
      return json({ error: "Operator access required." }, 403);
    const users =
      await sql`SELECT u.id, u.name, u.email, u."emailVerified" AS "emailVerified", u.role, u.banned, u."createdAt" AS "createdAt",
      (SELECT count(*)::int FROM saved_deals s WHERE s.user_id = u.id) AS "savedDeals"
      FROM neon_auth."user" u ORDER BY u."createdAt" DESC LIMIT 100`;
    return json({ users });
  } catch (error) {
    return unavailable(error);
  }
}
