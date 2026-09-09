import { and, eq, isNull } from "drizzle-orm";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { b2bError, b2bJson, b2bOptions } from "@/lib/auth/b2b-response";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { LISTING_PUBLIC_COLUMNS } from "@/lib/marketplace/listing";

export function OPTIONS() {
  return b2bOptions();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const authResult = await requireB2bAuth(request.headers.get("Authorization"), [
    "marketplace:read",
  ]);
  if (!authResult.success) {
    return b2bError(authResult.error, authResult.status);
  }

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
    return b2bError("Listing not found", 404);
  }

  return b2bJson({ listing: listing[0], slug });
}
