import { z } from "zod";
import { authorized, readJson, json, unavailable } from "@/lib/user-data";
import { sql } from "@/lib/db";
import { getDeals } from "@/lib/deals";
const input = z
  .object({
    items: z
      .array(
        z
          .object({
            name: z.string().trim().min(2).max(150),
            originalPriceCents: z.number().int().min(1).max(10000000),
            offerId: z.string().max(200).nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const s = await authorized(request);
    if (s.response) return s.response;
    return json({
      plans:
        await sql`SELECT id,items,created_at AS "createdAt" FROM cart_plans WHERE user_id=${s.user.id} ORDER BY created_at DESC LIMIT 20`,
    });
  } catch (e) {
    return unavailable(e);
  }
}
export async function POST(request: Request) {
  try {
    const s = await authorized(request, true);
    if (s.response) return s.response;
    const data = input.safeParse(await readJson(request));
    if (!data.success)
      return json({ error: "Please check your shopping list." }, 400);
    const deals = await getDeals();
    const ids = new Set(deals.map((d) => d.id));
    if (data.data.items.some((i) => i.offerId && !ids.has(i.offerId)))
      return json(
        {
          error:
            "One of these offers is no longer available. Compare your list again.",
        },
        400,
      );
    const items = data.data.items.map((i) => ({
      ...i,
      selectedPriceCents:
        deals.find((d) => d.id === i.offerId)?.priceCents ??
        i.originalPriceCents,
    }));
    const rows =
      await sql`INSERT INTO cart_plans(user_id,items) VALUES(${s.user.id},${JSON.stringify(items)}::jsonb) RETURNING id`;
    return json({ id: rows[0].id }, 201);
  } catch (e) {
    return unavailable(e);
  }
}
