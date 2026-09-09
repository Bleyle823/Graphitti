import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";
import { loadAllWorkflowTemplates } from "@/lib/workflow-templates/load-templates";
import { catalogMetaForTemplate, isCatalogTemplate } from "./catalog";

/**
 * Copies public catalog example workflows into a user's Saved workflows once.
 */
export async function cloneCatalogTemplatesForUser(
  userId: string
): Promise<{ created: number; skipped: number }> {
  const templates = loadAllWorkflowTemplates().filter((t) =>
    isCatalogTemplate(t.name)
  );

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const existing = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.userId, userId),
        eq(workflows.name, template.name),
        isNull(workflows.deletedAt)
      ),
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await db.insert(workflows).values({
      id: generateId(),
      name: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      userId,
      category: catalogMetaForTemplate(template)?.category,
      chain: catalogMetaForTemplate(template)?.chain,
      workflowType: catalogMetaForTemplate(template)?.workflowType ?? "read",
    });
    created += 1;
  }

  return { created, skipped };
}
