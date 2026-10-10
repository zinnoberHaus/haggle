import { z } from "zod";
import { sql } from "@/lib/db";
import { authorized, json, readJson, unavailable } from "@/lib/user-data";

export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    const alerts =
      await sql`SELECT id, offer_id AS "offerId", target_price_cents AS "targetPriceCents", observed_price_cents AS "observedPriceCents", observed_at AS "observedAt", read_at AS "readAt"
      FROM target_alerts WHERE user_id = ${access.user.id} ORDER BY observed_at DESC LIMIT 100`;
    return json({ alerts });
  } catch (error) {
    return unavailable(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = z
      .object({ id: z.uuid() })
      .strict()
      .safeParse(await readJson(request).catch(() => null));
    if (!parsed.success) return json({ error: "Choose a valid alert." }, 400);
    const alerts =
      await sql`UPDATE target_alerts SET read_at = now() WHERE id = ${parsed.data.id} AND user_id = ${access.user.id} RETURNING id`;
    if (!alerts.length) return json({ error: "Alert not found." }, 404);
    return json({ success: true });
  } catch (error) {
    return unavailable(error);
  }
}
