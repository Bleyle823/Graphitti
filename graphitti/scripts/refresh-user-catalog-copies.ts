import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull, like, or } from "drizzle-orm";

const CATALOG_OWNER_EMAIL = "templates@graphitti.local";

const DEFAULT_TEMPLATE_NAMES = [
  "Org USDC waterline keeper",
  "Stripe invoice to Privy USDC settlement",
] as const;

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

function isCopyName(baseName: string, workflowName: string): boolean {
  if (workflowName === baseName) {
    return true;
  }
  const copyPrefix = `${baseName} (Copy)`;
  return (
    workflowName === copyPrefix || workflowName.startsWith(`${copyPrefix} `)
  );
}

async function main(): Promise<void> {
  loadEnvFile();

  const userEmail = process.env.SYNC_USER_EMAIL?.trim();
  if (!userEmail) {
    console.error("Set SYNC_USER_EMAIL to the account that owns the workflow copies.");
    process.exit(1);
  }

  const templateNames = (
    process.env.SYNC_TEMPLATE_NAMES?.trim()
      ? process.env.SYNC_TEMPLATE_NAMES.split(",").map((s) => s.trim())
      : [...DEFAULT_TEMPLATE_NAMES]
  ).filter(Boolean);

  const { db } = await import("@/lib/db");
  const { users, workflows } = await import("@/lib/db/schema");
  const { loadAllWorkflowTemplates } = await import(
    "@/lib/workflow-templates/load-templates"
  );

  const catalogOwner = await db.query.users.findFirst({
    where: eq(users.email, CATALOG_OWNER_EMAIL),
  });
  if (!catalogOwner) {
    console.error(`No catalog owner user (${CATALOG_OWNER_EMAIL}). Run seed:marketplace.`);
    process.exit(1);
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.email, userEmail),
  });
  if (!targetUser) {
    console.error(`No user for SYNC_USER_EMAIL=${userEmail}`);
    process.exit(1);
  }

  const templatesByName = new Map(
    loadAllWorkflowTemplates().map((t) => [t.name, t])
  );

  for (const templateName of templateNames) {
    const template = templatesByName.get(templateName);
    if (!template) {
      console.error(`Unknown template: ${templateName}`);
      continue;
    }

    const catalogWorkflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.userId, catalogOwner.id),
        eq(workflows.name, templateName),
        isNull(workflows.deletedAt)
      ),
    });

    const nodes = catalogWorkflow?.nodes ?? template.nodes;
    const edges = catalogWorkflow?.edges ?? template.edges;
    const description =
      catalogWorkflow?.description ?? template.description;

    const userWorkflows = await db.query.workflows.findMany({
      where: and(
        eq(workflows.userId, targetUser.id),
        isNull(workflows.deletedAt),
        or(
          eq(workflows.name, templateName),
          like(workflows.name, `${templateName} (Copy)%`)
        )
      ),
    });

    const toUpdate = userWorkflows.filter((w) =>
      isCopyName(templateName, w.name)
    );

    if (toUpdate.length === 0) {
      const { generateId } = await import("@/lib/utils/id");
      const { catalogMetaForTemplate } = await import("@/lib/marketplace/catalog");
      const catalog = catalogMetaForTemplate(template);
      await db.insert(workflows).values({
        id: generateId(),
        name: templateName,
        description,
        nodes,
        edges,
        userId: targetUser.id,
        category: catalog?.category,
        chain: catalog?.chain,
        workflowType: catalog?.workflowType ?? "read",
        visibility: "private",
      });
      console.log(`Created  ${templateName} for ${userEmail}`);
      continue;
    }

    for (const row of toUpdate) {
      await db
        .update(workflows)
        .set({
          description,
          nodes,
          edges,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, row.id));
      console.log(`Refreshed  ${row.name} (${row.id})`);
    }
  }
}

main()
  .catch((error) => {
    console.error("refresh-user-catalog-copies failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { closeDbConnections } = await import("@/lib/db");
    await closeDbConnections();
  });
