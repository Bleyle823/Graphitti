import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userWallets, workflowExecutions, workflows } from "@/lib/db/schema";
import { isReservedSlug, toKebabSlug } from "./constants";

/** Listed marketplace workflows are readable by anyone, even if visibility is still private. */
export function isPubliclyReadable(workflow: {
  visibility: string;
  isListed?: boolean | null;
  deletedAt?: Date | string | null;
}): boolean {
  if (workflow.deletedAt) {
    return false;
  }
  return workflow.visibility === "public" || Boolean(workflow.isListed);
}

export const LISTING_PUBLIC_COLUMNS = {
  id: workflows.id,
  name: workflows.name,
  description: workflows.description,
  listedSlug: workflows.listedSlug,
  listedAt: workflows.listedAt,
  listingVersion: workflows.listingVersion,
  inputSchema: workflows.inputSchema,
  outputMapping: workflows.outputMapping,
  priceUsdcPerCall: workflows.priceUsdcPerCall,
  workflowType: workflows.workflowType,
  category: workflows.category,
  chain: workflows.chain,
  createdAt: workflows.createdAt,
  updatedAt: workflows.updatedAt,
} as const;

export type ListingPayload = {
  workflowId: string;
  slug?: string;
  priceUsdcPerCall?: string;
  category?: string;
  chain?: string;
  workflowType?: "read" | "write";
  inputSchema?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  listed?: boolean;
};

export async function hasSuccessfulRun(workflowId: string): Promise<boolean> {
  const run = await db.query.workflowExecutions.findFirst({
    where: and(
      eq(workflowExecutions.workflowId, workflowId),
      eq(workflowExecutions.status, "success")
    ),
    columns: { id: true },
  });
  return Boolean(run);
}

export async function requireCreatorWallet(userId: string) {
  const wallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, userId),
  });
  return wallet;
}

export async function upsertListing(
  userId: string,
  payload: ListingPayload
): Promise<
  | { success: true; listing: typeof workflows.$inferSelect }
  | { success: false; error: string; status: number }
> {
  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, payload.workflowId),
      eq(workflows.userId, userId)
    ),
  });

  if (!workflow || workflow.deletedAt) {
    return { success: false, error: "Workflow not found", status: 404 };
  }

  if (payload.listed === false) {
    const [updated] = await db
      .update(workflows)
      .set({
        isListed: false,
        updatedAt: new Date(),
      })
      .where(eq(workflows.id, workflow.id))
      .returning();
    return { success: true, listing: updated };
  }

  const slug = (
    payload.slug ||
    workflow.listedSlug ||
    toKebabSlug(workflow.name)
  ).toLowerCase();
  if (!slug) {
    return { success: false, error: "Slug is required", status: 400 };
  }
  if (isReservedSlug(slug)) {
    return { success: false, error: `Slug "${slug}" is reserved`, status: 400 };
  }
  if (
    workflow.listedSlug &&
    payload.slug &&
    payload.slug !== workflow.listedSlug
  ) {
    return {
      success: false,
      error: "Slug cannot change after the first publish",
      status: 400,
    };
  }

  const existingSlug = await db.query.workflows.findFirst({
    where: and(eq(workflows.listedSlug, slug), isNull(workflows.deletedAt)),
  });
  if (existingSlug && existingSlug.id !== workflow.id) {
    return { success: false, error: "That slug is already taken", status: 409 };
  }

  const price = payload.priceUsdcPerCall ?? workflow.priceUsdcPerCall ?? "0";
  if (Number(price) > 0) {
    const wallet = await requireCreatorWallet(userId);
    if (!wallet) {
      return {
        success: false,
        error:
          "Link a Privy wallet before listing a paid workflow. Payouts settle as Arc USDC to that address.",
        status: 400,
      };
    }
  }

  const [updated] = await db
    .update(workflows)
    .set({
      isListed: true,
      visibility: "public",
      listedSlug: workflow.listedSlug || slug,
      listedAt: workflow.listedAt ?? new Date(),
      listingVersion:
        (workflow.listingVersion ?? 1) + (workflow.isListed ? 1 : 0),
      priceUsdcPerCall: price,
      category: payload.category ?? workflow.category,
      chain: payload.chain ?? workflow.chain ?? "arc-testnet",
      workflowType: payload.workflowType ?? workflow.workflowType ?? "read",
      inputSchema: payload.inputSchema ?? workflow.inputSchema,
      outputMapping: payload.outputMapping ?? workflow.outputMapping,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, workflow.id))
    .returning();

  return { success: true, listing: updated };
}
