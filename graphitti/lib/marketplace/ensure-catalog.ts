import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workflows } from "@/lib/db/schema";
import {
  catalogMetaForTemplate,
  isCatalogTemplate,
} from "@/lib/marketplace/catalog";
import { generateId } from "@/lib/utils/id";
import { loadAllWorkflowTemplates } from "@/lib/workflow-templates/load-templates";
import type { WorkflowTemplate } from "@/lib/workflow-templates/normalize-export";

const CATALOG_SEED_USER_ID = "usr_catalog_seed";
const CATALOG_SEED_EMAIL = "catalog@graphitti.local";

let ensurePromise: Promise<void> | null = null;

async function getOrCreateCatalogUser() {
  const existing =
    (await db.query.users.findFirst({
      where: eq(users.id, CATALOG_SEED_USER_ID),
    })) ??
    (await db.query.users.findFirst({
      where: eq(users.email, CATALOG_SEED_EMAIL),
    }));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(users)
    .values({
      id: CATALOG_SEED_USER_ID,
      name: "Graphitti Catalog",
      email: CATALOG_SEED_EMAIL,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isAnonymous: false,
    })
    .returning();

  return created;
}

type CatalogListingFields = {
  description: string;
  nodes: WorkflowTemplate["nodes"];
  edges: WorkflowTemplate["edges"];
  visibility: "public";
  isListed: true;
  listedSlug: string;
  listedAt: Date;
  listingVersion: number;
  priceUsdcPerCall: string;
  category: string;
  chain: string;
  workflowType: "read" | "write";
  updatedAt: Date;
};

type ListedWorkflowRow = {
  id: string;
  listedSlug: string | null;
  isListed: boolean;
  name: string;
};

async function upsertCatalogTemplate(input: {
  userId: string;
  name: string;
  listingFields: CatalogListingFields;
  existingBySlug: Map<string, ListedWorkflowRow>;
}): Promise<void> {
  const listed = input.existingBySlug.get(input.listingFields.listedSlug);
  if (listed) {
    if (!listed.isListed) {
      await db
        .update(workflows)
        .set(input.listingFields)
        .where(eq(workflows.id, listed.id));
    }
    return;
  }

  const existingByName = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.userId, input.userId),
      eq(workflows.name, input.name)
    ),
  });
  if (existingByName) {
    await db
      .update(workflows)
      .set(input.listingFields)
      .where(eq(workflows.id, existingByName.id));
    return;
  }

  try {
    await db.insert(workflows).values({
      id: generateId(),
      name: input.name,
      userId: input.userId,
      ...input.listingFields,
    });
  } catch (error) {
    console.error(
      `[catalog] failed to list ${input.listingFields.listedSlug}:`,
      error instanceof Error ? error.message : error
    );
  }
}

async function ensureCatalogListingsOnce(): Promise<void> {
  const templates = loadAllWorkflowTemplates().filter((template) =>
    isCatalogTemplate(template.name)
  );
  if (templates.length === 0) {
    return;
  }

  const slugs = templates
    .map((template) => catalogMetaForTemplate(template)?.slug)
    .filter((slug): slug is string => Boolean(slug));

  const existingRows: ListedWorkflowRow[] =
    slugs.length > 0
      ? await db
          .select({
            id: workflows.id,
            listedSlug: workflows.listedSlug,
            isListed: workflows.isListed,
            name: workflows.name,
          })
          .from(workflows)
          .where(inArray(workflows.listedSlug, slugs))
      : [];

  const existingBySlug = new Map<string, ListedWorkflowRow>();
  for (const row of existingRows) {
    if (row.listedSlug) {
      existingBySlug.set(row.listedSlug, row);
    }
  }

  const user = await getOrCreateCatalogUser();
  if (!user) {
    throw new Error("Could not create catalog seed user");
  }

  for (const template of templates) {
    const catalog = catalogMetaForTemplate(template);
    if (!catalog) {
      continue;
    }

    await upsertCatalogTemplate({
      userId: user.id,
      name: template.name,
      existingBySlug,
      listingFields: {
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        visibility: "public",
        isListed: true,
        listedSlug: catalog.slug,
        listedAt: new Date(),
        listingVersion: 1,
        priceUsdcPerCall: catalog.priceUsdcPerCall,
        category: catalog.category,
        chain: catalog.chain,
        workflowType: catalog.workflowType,
        updatedAt: new Date(),
      },
    });
  }
}

/** Idempotently list in-memory catalog templates on the public marketplace. */
export async function ensureCatalogListings(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = ensureCatalogListingsOnce().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  await ensurePromise;
}
