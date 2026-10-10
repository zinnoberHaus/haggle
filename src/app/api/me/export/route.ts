import { sql } from "@/lib/db";
import { getUserPurchases } from "@/lib/purchases";
import {
  authorized,
  getPreferences,
  getSavings,
  listSavedDeals,
  unavailable,
} from "@/lib/user-data";
export async function GET(request: Request) {
  try {
    const access = await authorized(request);
    if (access.response) return access.response;
    const [
      preferences,
      savedDeals,
      savings,
      alerts,
      cartPlans,
      aiUsage,
      purchases,
      costComparisons,
    ] = await Promise.all([
      getPreferences(access.user.id),
      listSavedDeals(access.user.id),
      getSavings(access.user.id),
      sql`SELECT id, offer_id AS "offerId", target_price_cents AS "targetPriceCents", observed_price_cents AS "observedPriceCents", observed_at AS "observedAt", read_at AS "readAt" FROM target_alerts WHERE user_id = ${access.user.id} ORDER BY observed_at DESC`,
      sql`SELECT id,items,created_at AS "createdAt" FROM cart_plans WHERE user_id = ${access.user.id} ORDER BY created_at DESC`,
      sql`SELECT day,requests FROM ai_usage WHERE user_id = ${access.user.id} ORDER BY day DESC`,
      getUserPurchases(access.user.id),
      sql`SELECT id,input,result,source_snapshot AS "sourceSnapshot",created_at AS "createdAt",updated_at AS "updatedAt" FROM cost_comparisons WHERE user_id=${access.user.id} ORDER BY created_at DESC`,
    ]);
    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        user: {
          id: access.user.id,
          name: access.user.name,
          email: access.user.email,
        },
        preferences,
        savedDeals,
        savings,
        alerts,
        cartPlans,
        aiUsage,
        purchases,
        costComparisons,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": 'attachment; filename="haggle-account.json"',
        },
      },
    );
  } catch (error) {
    return unavailable(error);
  }
}
