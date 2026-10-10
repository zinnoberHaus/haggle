import { z } from "zod";
import { CostWorksheet } from "@/components/cost-worksheet";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getDeal } from "@/lib/deals";
import { snapshotOffer, type SavedComparison } from "@/lib/cost-comparison";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cost calculator · Haggle",
  description:
    "Compare checkout costs and conditional rewards with your own assumptions.",
};

export default async function Compare({
  searchParams,
}: {
  searchParams: Promise<{
    offerId?: string | string[];
    worksheet?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const offerId =
    typeof params.offerId === "string" ? params.offerId : undefined;
  const requestedId = z.uuid().safeParse(params.worksheet);
  const [user, requestedDeal] = await Promise.all([
    getCurrentUser(),
    offerId ? getDeal(offerId) : Promise.resolve(null),
  ]);
  const rows = user
    ? await sql`SELECT id, input, result, source_snapshot AS "sourceSnapshot", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM cost_comparisons WHERE user_id=${user.id} ORDER BY updated_at DESC LIMIT 50`
    : [];
  let selected = requestedId.success
    ? rows.find((row) => row.id === requestedId.data)
    : undefined;
  if (user && requestedId.success && !selected) {
    const matches =
      await sql`SELECT id, input, result, source_snapshot AS "sourceSnapshot", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM cost_comparisons WHERE user_id=${user.id} AND id=${requestedId.data}`;
    selected = matches[0];
  }
  const serialize = (row: Record<string, unknown>) =>
    ({
      ...row,
      createdAt: new Date(String(row.createdAt)).toISOString(),
      updatedAt: new Date(String(row.updatedAt)).toISOString(),
    }) as SavedComparison;
  const worksheet = selected ? serialize(selected) : null;
  const deal = worksheet?.input.offerId
    ? worksheet.input.offerId === requestedDeal?.id
      ? requestedDeal
      : await getDeal(worksheet.input.offerId)
    : worksheet
      ? null
      : requestedDeal;
  const source = deal ? snapshotOffer(deal) : null;
  const returnTo = requestedId.success
    ? `/compare?worksheet=${requestedId.data}`
    : source
      ? `/compare?offerId=${source.id}`
      : "/compare";
  return (
    <>
      <span className="eyebrow">Discount worksheet</span>
      <h1 className="page-title">The whole cost. With the conditions.</h1>
      <p className="page-intro">
        Work out what you expect to pay at checkout, then keep potential
        cashback and card rewards separate. No account needed to calculate.
      </p>
      {params.worksheet && !worksheet && (
        <p className="notice">
          {user
            ? "That saved worksheet was not found in your account. You can start a new one below."
            : "Sign in to open a saved worksheet. The calculator below is available without an account."}
        </p>
      )}
      {offerId && !requestedDeal && (
        <p className="notice">
          The requested source offer was not found. Enter your own amounts
          below.
        </p>
      )}
      <CostWorksheet
        key={worksheet?.id ?? source?.id ?? "new"}
        source={source}
        worksheet={worksheet}
        comparisons={rows.map(serialize)}
        signedIn={Boolean(user)}
        returnTo={returnTo}
      />
    </>
  );
}
