import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { ensureCatalogListings } from "@/lib/marketplace/ensure-catalog";
import {
  LISTING_PUBLIC_COLUMNS,
  upsertListing,
} from "@/lib/marketplace/listing";
import { checkIpRateLimit, getClientIp } from "@/lib/marketplace/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const rate = checkIpRateLimit(getClientIp(request), 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    await ensureCatalogListings();
  } catch (error) {
    console.error("[catalog] failed to ensure marketplace listings:", error);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const chain = searchParams.get("chain") ?? undefined;
  const workflowType = searchParams.get("workflowType");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? "20"))
  );
  const sort = searchParams.get("sort") ?? "recent";

  const filters = [eq(workflows.isListed, true), isNull(workflows.deletedAt)];
  if (q) {
    filters.push(ilike(workflows.name, `%${q}%`));
  }
  if (category) {
    filters.push(eq(workflows.category, category));
  }
  if (chain) {
    filters.push(eq(workflows.chain, chain));
  }
  if (workflowType === "read" || workflowType === "write") {
    filters.push(eq(workflows.workflowType, workflowType));
  }

  const order =
    sort === "newest" ? desc(workflows.createdAt) : desc(workflows.listedAt);

  const items = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(and(...filters))
    .orderBy(order)
    .limit(limit)
    .offset((page - 1) * limit);

  return NextResponse.json(
    { items, page, limit, total: items.length, sort },
    { headers: corsHeaders }
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    workflowId?: string;
    slug?: string;
    priceUsdcPerCall?: string;
    category?: string;
    chain?: string;
    workflowType?: "read" | "write";
    inputSchema?: Record<string, unknown>;
    outputMapping?: Record<string, unknown>;
    listed?: boolean;
  };

  if (!body.workflowId) {
    return NextResponse.json(
      { error: "workflowId is required" },
      { status: 400 }
    );
  }

  const result = await upsertListing(session.user.id, {
    workflowId: body.workflowId,
    slug: body.slug,
    priceUsdcPerCall: body.priceUsdcPerCall,
    category: body.category,
    chain: body.chain,
    workflowType: body.workflowType,
    inputSchema: body.inputSchema,
    outputMapping: body.outputMapping,
    listed: body.listed,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const listing = result.listing;
  return NextResponse.json({
    id: listing.id,
    listedSlug: listing.listedSlug,
    isListed: listing.isListed,
    priceUsdcPerCall: listing.priceUsdcPerCall,
    category: listing.category,
    chain: listing.chain,
    workflowType: listing.workflowType,
    inputSchema: listing.inputSchema,
    outputMapping: listing.outputMapping,
  });
}
