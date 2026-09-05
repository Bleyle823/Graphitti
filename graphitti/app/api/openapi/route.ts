import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";
import { buildOpenApiDocument } from "@/lib/marketplace/openapi";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const listings = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(and(eq(workflows.isListed, true), isNull(workflows.deletedAt)));

  return NextResponse.json(buildOpenApiDocument({ origin, listings }));
}
