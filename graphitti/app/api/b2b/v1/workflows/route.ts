import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(request: Request) {
  const authResult = await requireB2bAuth(
    request.headers.get("Authorization"),
    ["workflows:read"]
  );
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? "20"))
  );

  const filters = [eq(workflows.isListed, true), isNull(workflows.deletedAt)];
  if (q) {
    filters.push(ilike(workflows.name, `%${q}%`));
  }
  if (category) {
    filters.push(eq(workflows.category, category));
  }

  const items = await db
    .select(LISTING_PUBLIC_COLUMNS)
    .from(workflows)
    .where(and(...filters))
    .orderBy(desc(workflows.listedAt))
    .limit(limit);

  return b2bJson({ items, limit, count: items.length });
}
