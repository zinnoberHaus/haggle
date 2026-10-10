import "server-only";
import { sql } from "@/lib/db";

export const AI_DAILY_LIMIT = 10;
export const AI_LIMIT_MESSAGE =
  "You’ve used today’s 10 free AI requests across Ask and cart reviews. You can keep browsing and comparing the feed.";

/** One atomic allowance shared by every AI endpoint, using the UTC calendar day. */
export async function consumeAiRequest(userId: string): Promise<boolean> {
  const rows = await sql`INSERT INTO ai_usage(user_id,day,requests)
    VALUES(${userId},(now() AT TIME ZONE 'UTC')::date,1)
    ON CONFLICT(user_id,day) DO UPDATE SET requests=ai_usage.requests+1
    WHERE ai_usage.requests<${AI_DAILY_LIMIT} RETURNING requests`;
  return rows.length > 0;
}
