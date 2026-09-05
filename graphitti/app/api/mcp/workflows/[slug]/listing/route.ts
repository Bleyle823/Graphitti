import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
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
  const listing = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(
      and(
        eq(workflows.listedSlug, slug),
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

  return NextResponse.json(listing[0], { headers: corsHeaders });
}
