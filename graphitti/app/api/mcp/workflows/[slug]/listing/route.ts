import { and, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import {
  normalizeListingSlug,
  parseListingPriceUsdc,
} from "@/lib/marketplace/constants";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = normalizeListingSlug(slug);
  const candidates = Array.from(new Set([normalized, slug.trim()])).filter(
    Boolean
  );
  const listing = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(
      and(
        inArray(workflows.listedSlug, candidates),
        eq(workflows.isListed, true),
        isNull(workflows.deletedAt)
      )
    )
    .limit(1);

  if (!listing[0]) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404, headers: corsHeaders }
    );
  }

  const item = listing[0];
  const price = Number(parseListingPriceUsdc(item.priceUsdcPerCall));
  return NextResponse.json(
    {
      ...item,
      paymentRequired: price > 0,
      callPath: `/api/mcp/workflows/${encodeURIComponent(item.listedSlug ?? normalized)}/call`,
    },
    { headers: corsHeaders }
  );
}
