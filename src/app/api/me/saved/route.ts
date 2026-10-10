import { sql } from "@/lib/db";
import {
  authorized,
  json,
  listSavedDeals,
  readJson,
  savedInputSchema,
  unavailable,
  offerIdSchema,
} from "@/lib/user-data";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    return json({ saved: await listSavedDeals(access.user.id) });
  } catch (error) {
    return unavailable(error);
  }
}
export async function POST(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = savedInputSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json({ error: "Choose a valid deal and target price." }, 400);
    const { offerId, targetPriceCents } = parsed.data;
    const offers = await sql`SELECT id FROM offers WHERE id = ${offerId}`;
    if (!offers.length)
      return json({ error: "This deal is no longer available." }, 404);
    const rows =
      await sql`INSERT INTO saved_deals (user_id, offer_id, target_price_cents)
      VALUES (${access.user.id}, ${offerId}, ${targetPriceCents ?? null})
      ON CONFLICT (user_id, offer_id) DO UPDATE SET target_price_cents =
        CASE WHEN ${targetPriceCents !== undefined} THEN EXCLUDED.target_price_cents ELSE saved_deals.target_price_cents END
      RETURNING offer_id AS "offerId", target_price_cents AS "targetPriceCents", created_at AS "createdAt"`;
    return json({ saved: rows[0] });
  } catch (error) {
    return unavailable(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = z
      .object({ offerId: offerIdSchema })
      .strict()
      .safeParse(await readJson(request).catch(() => null));
    if (!parsed.success) return json({ error: "Choose a valid deal." }, 400);
    await sql`DELETE FROM saved_deals WHERE user_id = ${access.user.id} AND offer_id = ${parsed.data.offerId}`;
    return json({ success: true });
  } catch (error) {
    return unavailable(error);
  }
}
