import { authorized, json, readJson, unavailable } from "@/lib/user-data";
import {
  purchaseIdSchema,
  purchaseInputSchema,
  purchaseUpdateSchema,
  summarizePurchases,
} from "@/lib/purchase-values";
import {
  checkPurchaseReferences,
  createPurchase,
  deletePurchase,
  getUserPurchase,
  getUserPurchases,
  updatePurchase,
} from "@/lib/purchases";

export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    const purchases = await getUserPurchases(access.user.id);
    return json({ purchases, totals: summarizePurchases(purchases) });
  } catch (error) {
    return unavailable(error);
  }
}
export async function POST(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = purchaseInputSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json(
        {
          error:
            parsed.error.issues[0]?.message || "Check your purchase details.",
        },
        400,
      );
    const invalidReference = await checkPurchaseReferences(
      access.user.id,
      parsed.data,
    );
    if (invalidReference) return json({ error: invalidReference }, 400);
    return json(
      { purchase: await createPurchase(access.user.id, parsed.data) },
      201,
    );
  } catch (error) {
    return unavailable(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = purchaseUpdateSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json(
        {
          error:
            parsed.error.issues[0]?.message || "Check your purchase details.",
        },
        400,
      );
    const { id, ...input } = parsed.data;
    if (!(await getUserPurchase(access.user.id, id)))
      return json({ error: "Purchase not found." }, 404);
    const invalidReference = await checkPurchaseReferences(
      access.user.id,
      input,
    );
    if (invalidReference) return json({ error: invalidReference }, 400);
    const purchase = await updatePurchase(access.user.id, id, input);
    return purchase
      ? json({ purchase })
      : json({ error: "Purchase not found." }, 404);
  } catch (error) {
    return unavailable(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const access = await authorized(request, true);
    if (access.response) return access.response;
    const parsed = purchaseIdSchema.safeParse(
      await readJson(request).catch(() => null),
    );
    if (!parsed.success)
      return json({ error: "Choose a valid purchase." }, 400);
    return (await deletePurchase(access.user.id, parsed.data.id))
      ? json({ success: true })
      : json({ error: "Purchase not found." }, 404);
  } catch (error) {
    return unavailable(error);
  }
}
