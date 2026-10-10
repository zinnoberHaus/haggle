import { timingSafeEqual } from "node:crypto";
import { ingestDeals } from "@/lib/ingestion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return Response.json(await ingestDeals(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Database URLs and upstream response bodies must never leak to clients/logs.
    console.error("DealNews feed ingestion failed.");
    return Response.json(
      {
        error:
          "The feed could not be refreshed. Existing records were retained.",
      },
      { status: 502 },
    );
  }
}
