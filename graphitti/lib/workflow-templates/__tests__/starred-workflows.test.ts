import { describe, expect, it } from "vitest";
import { loadInMemoryWorkflowTemplates } from "../load-templates";

const STARRED_NAMES = [
  "FPL League Top Two USDC Payouts",
  "Stripe invoice to Privy USDC settlement",
  "Aave Uniswap USDC keeper",
] as const;

function actionTypes(template: {
  nodes: { data: { config?: Record<string, string> } }[];
}) {
  return template.nodes
    .map((node) => node.data.config?.actionType)
    .filter((value): value is string => typeof value === "string");
}

describe("starred workflow templates", () => {
  it("do not use sandbox code nodes", () => {
    const templates = loadInMemoryWorkflowTemplates().filter((template) =>
      (STARRED_NAMES as readonly string[]).includes(template.name)
    );

    expect(templates).toHaveLength(STARRED_NAMES.length);
    for (const template of templates) {
      expect(actionTypes(template)).not.toContain("code/run-code");
    }
  });

  it("keeper uses live subgraph ids and ends with Privy send and Telegram", () => {
    const keeper = loadInMemoryWorkflowTemplates().find(
      (template) => template.name === "Aave Uniswap USDC keeper"
    );
    expect(keeper).toBeDefined();
    const types = actionTypes(keeper!);
    expect(types).toContain("the-graph/query-subgraph");
    expect(types).toContain("privy/wallet-transfer");
    expect(types).toContain("telegram/send-message");
    expect(types.at(-2)).toBe("privy/wallet-transfer");
    expect(types.at(-1)).toBe("telegram/send-message");

    const configs = keeper!.nodes.map((node) => node.data.config ?? {});
    const subgraphIds = configs
      .map((config) => config.id)
      .filter((id): id is string => typeof id === "string");
    expect(subgraphIds).toContain(
      "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk"
    );
    expect(subgraphIds).toContain(
      "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV"
    );
  });
});
