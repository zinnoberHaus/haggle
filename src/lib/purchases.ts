import "server-only";
import { sql } from "@/lib/db";
import { getDeal } from "@/lib/deals";
import {
  reportedPurchaseAmounts,
  summarizePurchases,
  validatePurchaseReferences,
  type Purchase,
  type PurchaseInput,
  type ObservedPurchaseOffer,
} from "@/lib/purchase-values";

function toPurchase(row: Record<string, unknown>): Purchase {
  const date = (value: unknown) => new Date(String(value)).toISOString();
  const purchase: PurchaseInput = {
    cartPlanId: row.cart_plan_id ? String(row.cart_plan_id) : null,
    offerId: row.offer_id ? String(row.offer_id) : null,
    productName: String(row.product_name),
    merchant: String(row.merchant),
    purchasedOn: date(row.purchased_on).slice(0, 10),
    paidTotalCents: Number(row.paid_total_cents),
    baselineTotalCents:
      row.baseline_total_cents === null
        ? null
        : Number(row.baseline_total_cents),
    policyUrl: row.policy_url ? String(row.policy_url) : null,
    adjustmentDeadline: row.adjustment_deadline
      ? date(row.adjustment_deadline).slice(0, 10)
      : null,
    adjustmentStatus:
      row.adjustment_status as PurchaseInput["adjustmentStatus"],
    refundCents: Number(row.refund_cents),
  };
  return {
    ...purchase,
    id: String(row.id),
    reportedSavingsCents:
      reportedPurchaseAmounts(purchase).reportedSavingsCents,
    feeCents: 0,
    createdAt: date(row.created_at),
    updatedAt: date(row.updated_at),
  };
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const rows =
    await sql`SELECT * FROM purchases WHERE user_id = ${userId} ORDER BY purchased_on DESC, created_at DESC`;
  return rows.map(toPurchase);
}
export async function getReportedPurchaseSavings(userId: string) {
  const purchases = await getUserPurchases(userId);
  return { ...summarizePurchases(purchases), purchases };
}
export async function getUserPurchase(
  userId: string,
  id: string,
): Promise<Purchase | null> {
  const rows =
    await sql`SELECT * FROM purchases WHERE id = ${id} AND user_id = ${userId}`;
  return rows[0] ? toPurchase(rows[0]) : null;
}
export async function checkPurchaseReferences(
  userId: string,
  input: PurchaseInput,
) {
  return validatePurchaseReferences(input, userId, {
    getPlanOwner: async (id) => {
      const rows =
        await sql`SELECT user_id FROM cart_plans WHERE id = ${id} AND user_id = ${userId}`;
      return rows[0] ? String(rows[0].user_id) : null;
    },
    offerExists: async (id) => {
      const rows = await sql`SELECT id FROM offers WHERE id = ${id}`;
      return rows.length > 0;
    },
  });
}
export async function createPurchase(
  userId: string,
  input: PurchaseInput,
): Promise<Purchase> {
  const rows = await sql`INSERT INTO purchases
    (user_id, cart_plan_id, offer_id, product_name, merchant, purchased_on, paid_total_cents, baseline_total_cents, policy_url, adjustment_deadline, adjustment_status, refund_cents)
    VALUES (${userId}, ${input.cartPlanId}, ${input.offerId}, ${input.productName}, ${input.merchant}, ${input.purchasedOn}, ${input.paidTotalCents}, ${input.baselineTotalCents}, ${input.policyUrl}, ${input.adjustmentDeadline}, ${input.adjustmentStatus}, ${input.refundCents}) RETURNING *`;
  return toPurchase(rows[0]);
}
export async function updatePurchase(
  userId: string,
  id: string,
  input: PurchaseInput,
): Promise<Purchase | null> {
  const rows =
    await sql`UPDATE purchases SET cart_plan_id = ${input.cartPlanId}, offer_id = ${input.offerId}, product_name = ${input.productName}, merchant = ${input.merchant}, purchased_on = ${input.purchasedOn}, paid_total_cents = ${input.paidTotalCents}, baseline_total_cents = ${input.baselineTotalCents}, policy_url = ${input.policyUrl}, adjustment_deadline = ${input.adjustmentDeadline}, adjustment_status = ${input.adjustmentStatus}, refund_cents = ${input.refundCents}, updated_at = now()
    WHERE id = ${id} AND user_id = ${userId} RETURNING *`;
  return rows[0] ? toPurchase(rows[0]) : null;
}
export async function deletePurchase(
  userId: string,
  id: string,
): Promise<boolean> {
  const rows =
    await sql`DELETE FROM purchases WHERE id = ${id} AND user_id = ${userId} RETURNING id`;
  return rows.length > 0;
}
export async function getPurchaseOffer(
  offerId: string | null,
): Promise<ObservedPurchaseOffer | null> {
  if (!offerId) return null;
  const offer = await getDeal(offerId);
  if (!offer) return null;
  const {
    id,
    title,
    merchant,
    priceCents,
    priceType,
    sourceName,
    sourceUrl,
    fetchedAt,
    status,
  } = offer;
  return {
    id,
    title,
    merchant,
    priceCents,
    priceType,
    sourceName,
    sourceUrl,
    fetchedAt,
    status,
  };
}
