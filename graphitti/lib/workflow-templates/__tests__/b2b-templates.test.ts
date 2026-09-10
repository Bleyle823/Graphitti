import { describe, expect, it } from "vitest";
import { MARKETPLACE_CATALOG } from "@/lib/marketplace/catalog";
import { B2B_WORKFLOW_TEMPLATES } from "@/lib/workflow-templates/b2b-templates";
import { loadInMemoryWorkflowTemplates } from "@/lib/workflow-templates/load-templates";

describe("B2B workflow templates", () => {
  it("includes eight templates with treasury and at least two privy actions", () => {
    const loadedNames = loadInMemoryWorkflowTemplates().map(
      (template) => template.name
    );
    expect(B2B_WORKFLOW_TEMPLATES).toHaveLength(8);
    for (const template of B2B_WORKFLOW_TEMPLATES) {
      const actionTypes = template.nodes
        .map((node) => node.data.config?.actionType)
        .filter((value): value is string => typeof value === "string");
      expect(actionTypes).toContain("treasury/get-org-wallet");
      const privyCount = actionTypes.filter((type) =>
        type.startsWith("privy/")
      ).length;
      expect(privyCount).toBeGreaterThanOrEqual(2);
      expect(MARKETPLACE_CATALOG[template.name]).toBeDefined();
      expect(loadedNames).toContain(template.name);
    }
  });
});
