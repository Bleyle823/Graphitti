import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvFile(): void {
  const envFile = process.env.SEED_ENV_FILE?.trim() || ".env.local";
  const envPath = join(process.cwd(), envFile);
  if (!existsSync(envPath)) {
    return;
  }
  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (process.env[key]) {
      continue;
    }
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const { and, eq } = await import("drizzle-orm");
  const { db, migrationClient } = await import("@/lib/db");
  const { users, workflows } = await import("@/lib/db/schema");
  const { loadAllWorkflowTemplates } = await import(
    "@/lib/workflow-templates/load-templates"
  );
  const { catalogMetaForTemplate, isCatalogTemplate } = await import(
    "@/lib/marketplace/catalog"
  );
  const { generateId } = await import("@/lib/utils/id");

  const listOnly = process.env.SEED_LIST === "1";
  const email = process.env.SEED_USER_EMAIL?.trim();
  let user = email
    ? await db.query.users.findFirst({ where: eq(users.email, email) })
    : await db.query.users.findFirst();

  if (!user && listOnly) {
    user = await db.query.users.findFirst({
      where: eq(users.id, "usr_catalog_seed"),
    });
    if (!user) {
      const [created] = await db
        .insert(users)
        .values({
          id: "usr_catalog_seed",
          name: "Graphitti Catalog",
          email: "catalog@graphitti.local",
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          isAnonymous: false,
        })
        .returning();
      user = created;
    }
  }

  if (!user) {
    console.error(
      email
        ? `No user found for SEED_USER_EMAIL=${email}`
        : "No users in database. Sign in once, then re-run pnpm seed:workflows."
    );
    process.exit(1);
  }

  const allTemplates = loadAllWorkflowTemplates();
  const templates = listOnly
    ? allTemplates.filter((t) => isCatalogTemplate(t.name))
    : allTemplates;

  console.log(
    `Seeding ${templates.length} workflow templates for ${user.email ?? user.id}${listOnly ? " (marketplace catalog)" : ""}`
  );

  for (const template of templates) {
    const catalog = catalogMetaForTemplate(template);
    const listingFields =
      listOnly && catalog
        ? {
            visibility: "public" as const,
            isListed: true,
            listedSlug: catalog.slug,
            listedAt: new Date(),
            listingVersion: 1,
            priceUsdcPerCall: catalog.priceUsdcPerCall,
            category: catalog.category,
            chain: catalog.chain,
            workflowType: catalog.workflowType,
          }
        : {};

    const existing = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.userId, user.id),
        eq(workflows.name, template.name)
      ),
    });

    if (existing) {
      await db
        .update(workflows)
        .set({
          description: template.description,
          nodes: template.nodes,
          edges: template.edges,
          updatedAt: new Date(),
          ...listingFields,
        })
        .where(eq(workflows.id, existing.id));
      console.log(`Updated  ${template.name}`);
      continue;
    }

    await db.insert(workflows).values({
      id: generateId(),
      name: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      userId: user.id,
      ...listingFields,
    });
    console.log(`Created  ${template.name}`);
  }

  if (listOnly) {
    console.log(
      `Catalog slugs: ${templates
        .map((t) => catalogMetaForTemplate(t)?.slug)
        .filter(Boolean)
        .join(", ")}`
    );
  }
}

main()
  .catch((error) => {
    console.error("Failed to seed workflow templates:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { closeDbConnections } = await import("@/lib/db");
    await closeDbConnections();
  });
