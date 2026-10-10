import "server-only";
import { z } from "zod";
import { getCurrentUser, rejectCrossOrigin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const offerIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9._:-]+$/);
export const savedInputSchema = z
  .object({
    offerId: offerIdSchema,
    targetPriceCents: z
      .number()
      .int()
      .min(1)
      .max(100_000_000)
      .nullable()
      .optional(),
  })
  .strict();
export const preferencesSchema = z
  .object({
    emailAlerts: z.boolean(),
    weeklyDigest: z.boolean(),
  })
  .strict();

export async function listSavedDeals(userId: string) {
  return sql`SELECT offer_id AS "offerId", target_price_cents AS "targetPriceCents", created_at AS "createdAt"
    FROM saved_deals WHERE user_id = ${userId} ORDER BY created_at DESC`;
}
export async function getPreferences(userId: string) {
  const rows =
    await sql`SELECT email_alerts AS "emailAlerts", weekly_digest AS "weeklyDigest" FROM profiles WHERE user_id = ${userId}`;
  return rows[0] ?? { emailAlerts: false, weeklyDigest: false };
}
export async function getSavings(userId: string) {
  const entries =
    await sql`SELECT id, description, saved_cents AS "savedCents", fee_cents AS "feeCents", recorded_at AS "recordedAt"
    FROM savings_ledger WHERE user_id = ${userId} ORDER BY recorded_at DESC`;
  return {
    entries,
    totalSavedCents: entries.reduce(
      (sum, entry) => sum + Number(entry.savedCents),
      0,
    ),
    totalFeeCents: entries.reduce(
      (sum, entry) => sum + Number(entry.feeCents),
      0,
    ),
  };
}
export async function authorized(request: Request, mutation = false) {
  if (mutation) {
    const rejected = rejectCrossOrigin(request);
    if (rejected) return { response: rejected, user: null };
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return {
        response: Response.json(
          { error: "JSON is required." },
          { status: 415 },
        ),
        user: null,
      };
    }
    const contentLength = Number(request.headers.get("content-length"));
    if (contentLength > 8192)
      return {
        response: Response.json(
          { error: "Request too large." },
          { status: 413 },
        ),
        user: null,
      };
  }
  const user = await getCurrentUser();
  if (!user)
    return {
      response: Response.json(
        { error: "Sign in to continue." },
        { status: 401 },
      ),
      user: null,
    };
  return { response: null, user };
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function unavailable(error: unknown) {
  // Only an error class is logged: database URLs, rows and credentials stay private.
  console.error(
    "Account request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return json(
    { error: "Your account could not be loaded. Please try again." },
    503,
  );
}
export async function readJson(request: Request) {
  const body = await request.text();
  if (body.length > 8192) throw new Error("Body too large");
  return JSON.parse(body) as unknown;
}
