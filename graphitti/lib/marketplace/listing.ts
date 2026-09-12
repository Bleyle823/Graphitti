import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userWallets, workflowExecutions, workflows } from "@/lib/db/schema";
import {
  isReservedSlug,
  normalizeListingSlug,
  parseListingPriceUsdc,
  toKebabSlug,
} from "./constants";

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

function listingSlugError(
  workflow: typeof workflows.$inferSelect,
  slug: string,
  payloadSlug?: string
): { error: string; status: number } | null {
  if (!slug) {
    return { error: "Slug is required", status: 400 };
  }
  if (isReservedSlug(slug)) {
    return { error: `Slug "${slug}" is reserved`, status: 400 };
  }
  if (
    workflow.listedSlug &&
    payloadSlug &&
    normalizeListingSlug(payloadSlug) !== workflow.listedSlug
  ) {
    return {
      error: "Slug cannot change after the first publish",
      status: 400,
    };
  }
  return null;
}

async function unlistWorkflow(workflowId: string) {
  const [unlisted] = await db
    .update(workflows)
    .set({
      isListed: false,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, workflowId))
    .returning();
  return unlisted;
}

async function paidListingWalletError(
  userId: string,
  price: string
): Promise<{ error: string; status: number } | null> {
  if (Number(price) <= 0) {
    return null;
  }
  const wallet = await requireCreatorWallet(userId);
  if (wallet) {
    return null;
  }
  return {
    error:
      "Link a Privy wallet before listing a paid workflow. Agents pay per call in Arc USDC via Circle nanopayments to that address.",
    status: 400,
  };
}

async function takenSlugError(
  slug: string,
  workflowId: string
): Promise<{ error: string; status: number } | null> {
  const existingSlug = await db.query.workflows.findFirst({
    where: and(eq(workflows.listedSlug, slug), isNull(workflows.deletedAt)),
  });
  if (existingSlug && existingSlug.id !== workflowId) {
    return { error: "That slug is already taken", status: 409 };
  }
  return null;
}

async function publishListingRow(options: {
  workflow: typeof workflows.$inferSelect;
  slug: string;
  price: string;
  payload: ListingPayload;
}) {
  const [updated] = await db
    .update(workflows)
    .set({
      isListed: true,
      visibility: "public",
      listedSlug: options.workflow.listedSlug || options.slug,
      listedAt: options.workflow.listedAt ?? new Date(),
      listingVersion:
        (options.workflow.listingVersion ?? 1) +
        (options.workflow.isListed ? 1 : 0),
      priceUsdcPerCall: options.price,
      category: options.payload.category ?? options.workflow.category,
      chain: options.payload.chain ?? options.workflow.chain ?? "arc-testnet",
      workflowType:
        options.payload.workflowType ?? options.workflow.workflowType ?? "read",
      inputSchema: options.payload.inputSchema ?? options.workflow.inputSchema,
      outputMapping:
        options.payload.outputMapping ?? options.workflow.outputMapping,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, options.workflow.id))
    .returning();
  return updated;
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
    return { success: true, listing: await unlistWorkflow(workflow.id) };
  }

  const slug = normalizeListingSlug(
    payload.slug || workflow.listedSlug || toKebabSlug(workflow.name)
  );
  const slugError = listingSlugError(workflow, slug, payload.slug);
  if (slugError) {
    return { success: false, ...slugError };
  }

  const takenError = await takenSlugError(slug, workflow.id);
  if (takenError) {
    return { success: false, ...takenError };
  }

  const price = parseListingPriceUsdc(
    payload.priceUsdcPerCall ?? workflow.priceUsdcPerCall ?? "0"
  );
  const walletError = await paidListingWalletError(userId, price);
  if (walletError) {
    return { success: false, ...walletError };
  }

  return {
    success: true,
    listing: await publishListingRow({ workflow, slug, price, payload }),
  };
}
