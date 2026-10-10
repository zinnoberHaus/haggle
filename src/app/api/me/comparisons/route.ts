import { z } from "zod";
import { authorized, readJson, json, unavailable } from "@/lib/user-data";
import { sql } from "@/lib/db";
import { getDeal } from "@/lib/deals";
import {
  calculateCost,
  costInputSchema,
  offerWarnings,
  snapshotOffer,
} from "@/lib/cost-comparison";

const idSchema = z.object({ id: z.uuid() }).strict();
const updateSchema = z
  .object({ id: z.uuid(), input: costInputSchema })
  .strict();

export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    const comparisons =
      await sql`SELECT id, input, result, source_snapshot AS "sourceSnapshot", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM cost_comparisons WHERE user_id=${access.user.id} ORDER BY updated_at DESC LIMIT 50`;
    return json({ comparisons });
  } catch (error) {
    return unavailable(error);
  }
}

async function save(request: Request, update: boolean) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const body = await readJson(request).catch(() => null);
    const parsed = update
      ? updateSchema.safeParse(body)
      : z.object({ input: costInputSchema }).strict().safeParse(body);
    if (!parsed.success)
      return json(
        {
          error:
            parsed.error.issues[0]?.message ??
            "Check the worksheet amounts and notes.",
        },
        400,
      );
    const input = parsed.data.input;
    const id = "id" in parsed.data ? String(parsed.data.id) : null;
    // Resolve ownership before reading source records or attempting an update.
    if (id) {
      const owned =
        await sql`SELECT id FROM cost_comparisons WHERE id=${id} AND user_id=${access.user.id}`;
      if (!owned.length) return json({ error: "Worksheet not found." }, 404);
    }
    const deal = input.offerId ? await getDeal(input.offerId) : null;
    if (input.offerId && !deal)
      return json(
        {
          error:
            "The linked offer is not known. Remove its link or choose a collected offer.",
        },
        400,
      );
    const sourceSnapshot = deal ? snapshotOffer(deal) : null;
    const result = calculateCost(input);
    const sourceJson = sourceSnapshot ? JSON.stringify(sourceSnapshot) : null;
    const rows = id
      ? await sql`UPDATE cost_comparisons SET input=${JSON.stringify(input)}::jsonb, result=${JSON.stringify(result)}::jsonb,
          source_snapshot=${sourceJson}::jsonb, updated_at=now() WHERE id=${id} AND user_id=${access.user.id}
          RETURNING id, input, result, source_snapshot AS "sourceSnapshot", created_at AS "createdAt", updated_at AS "updatedAt"`
      : await sql`INSERT INTO cost_comparisons(user_id, input, result, source_snapshot)
          VALUES(${access.user.id},${JSON.stringify(input)}::jsonb,${JSON.stringify(result)}::jsonb,${sourceJson}::jsonb)
          RETURNING id, input, result, source_snapshot AS "sourceSnapshot", created_at AS "createdAt", updated_at AS "updatedAt"`;
    if (!rows.length) return json({ error: "Worksheet not found." }, 404);
    return json(
      { comparison: rows[0], warnings: offerWarnings(input, sourceSnapshot) },
      id ? 200 : 201,
    );
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request) {
  return save(request, false);
}
export async function PATCH(request: Request) {
  return save(request, true);
}
export async function DELETE(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = idSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json({ error: "Choose a valid worksheet." }, 400);
    const rows =
      await sql`DELETE FROM cost_comparisons WHERE id=${parsed.data.id} AND user_id=${access.user.id} RETURNING id`;
    if (!rows.length) return json({ error: "Worksheet not found." }, 404);
    return json({ success: true });
  } catch (error) {
    return unavailable(error);
  }
}
