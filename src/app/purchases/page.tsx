import Link from "next/link";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getDeals } from "@/lib/deals";
import { getPurchaseOffer, getUserPurchases } from "@/lib/purchases";
import { MyNav } from "@/components/my-nav";
import { PurchaseNotebook } from "@/components/purchase-notebook";
import type { PurchasePrefill } from "@/components/purchase-form";
import type { ObservedPurchaseOffer } from "@/lib/purchase-values";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purchases & price adjustments · Haggle" };
const planItemsSchema = z
  .array(
    z.object({
      name: z.string().min(2).max(150),
      originalPriceCents: z.number().int().min(0).max(100_000_000),
      offerId: z.string().nullable(),
    }),
  )
  .max(10);

export default async function Purchases({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; offer?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const returnParams = new URLSearchParams();
  if (params.plan && z.uuid().safeParse(params.plan).success)
    returnParams.set("plan", params.plan);
  if (params.offer && /^dn-[a-f0-9]{24}$/.test(params.offer))
    returnParams.set("offer", params.offer);
  const next = `/purchases${returnParams.size ? `?${returnParams}` : ""}`;
  if (!user)
    return (
      <>
        <MyNav />
        <span className="eyebrow">After you buy</span>
        <h1 className="page-title">Keep the receipt. Know your next step.</h1>
        <p className="page-intro">
          Record the totals you actually paid, keep a retailer’s
          price-adjustment policy with the purchase, and prepare a request you
          can send yourself.
        </p>
        <div className="empty-state">
          <h2>Your purchase notebook stays private.</h2>
          <p>
            Sign in to keep purchase records and reported refunds with your
            account. Haggle does not place orders, confirm eligibility, or
            submit requests.
          </p>
          <Link
            className="button"
            href={`/sign-in?next=${encodeURIComponent(next)}`}
          >
            Sign in to record a purchase
          </Link>{" "}
          <Link href={`/sign-up?next=${encodeURIComponent(next)}`}>
            Create an account
          </Link>
        </div>
      </>
    );
  const [purchases, currentOffers] = await Promise.all([
    getUserPurchases(user.id),
    getDeals(),
  ]);
  const offers = new Map<string, ObservedPurchaseOffer>(
    currentOffers.map(
      ({
        id,
        title,
        merchant,
        priceCents,
        priceType,
        sourceName,
        sourceUrl,
        fetchedAt,
        status,
      }) => [
        id,
        {
          id,
          title,
          merchant,
          priceCents,
          priceType,
          sourceName,
          sourceUrl,
          fetchedAt,
          status,
        },
      ],
    ),
  );
  const linkedIds = new Set(
    purchases
      .map((purchase) => purchase.offerId)
      .filter((id): id is string => !!id),
  );
  if (returnParams.get("offer")) linkedIds.add(returnParams.get("offer")!);
  const prefills: PurchasePrefill[] = [];
  let prefillNotice = "";
  if (params.plan) {
    const valid = z.uuid().safeParse(params.plan);
    const rows = valid.success
      ? await sql`SELECT items FROM cart_plans WHERE id = ${valid.data} AND user_id = ${user.id}`
      : [];
    const items = planItemsSchema.safeParse(rows[0]?.items);
    if (!items.success)
      prefillNotice =
        "That shopping plan is not available to your account. You can still record a purchase below.";
    else
      for (const item of items.data) {
        if (item.offerId) linkedIds.add(item.offerId);
        prefills.push({
          cartPlanId: valid.data!,
          offerId: item.offerId,
          productName: item.name,
          merchant: "",
          baselineTotalCents: item.originalPriceCents,
        });
      }
  }
  await Promise.all(
    [...linkedIds]
      .filter((id) => !offers.has(id))
      .map(async (id) => {
        const offer = await getPurchaseOffer(id);
        if (offer) offers.set(id, offer);
      }),
  );
  for (const prefill of prefills) {
    const offer = prefill.offerId ? offers.get(prefill.offerId) : null;
    if (offer) {
      prefill.productName = offer.title.slice(0, 150);
      prefill.merchant = offer.merchant;
    } else prefill.offerId = null;
  }
  if (!params.plan && params.offer) {
    const offer = offers.get(params.offer);
    if (offer)
      prefills.push({
        cartPlanId: null,
        offerId: offer.id,
        productName: offer.title.slice(0, 150),
        merchant: offer.merchant,
        baselineTotalCents: null,
      });
    else
      prefillNotice =
        "That source offer could not be found. You can still record a purchase without linking an offer.";
  }
  return (
    <>
      <MyNav />
      <span className="eyebrow">After you buy</span>
      <h1 className="page-title">Your purchases, with the details kept.</h1>
      <p className="page-intro">
        A receipt notebook for actual paid totals, reported savings and
        price-adjustment requests. You control the record and contact the
        retailer yourself.
      </p>
      {prefillNotice && <p className="notice">{prefillNotice}</p>}
      <PurchaseNotebook
        initialPurchases={purchases}
        offers={[...offers.values()]}
        prefills={prefills}
        userName={user.name}
      />
    </>
  );
}
