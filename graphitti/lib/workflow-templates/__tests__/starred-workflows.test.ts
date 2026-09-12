import { describe, expect, it } from "vitest";
import { HACKATHON_FEATURED_WORKFLOW_NAMES } from "../../marketplace/catalog";
import { loadInMemoryWorkflowTemplates } from "../load-templates";

const STARRED_NAMES = HACKATHON_FEATURED_WORKFLOW_NAMES;

type TemplateNode = {
  id: string;
  type?: string;
  data: { config?: Record<string, string> };
};

type TemplateEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
};

type Template = {
  name: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
};

function requireTemplate(name: string): Template {
  const template = loadInMemoryWorkflowTemplates().find(
    (item) => item.name === name
  );
  if (!template) {
    throw new Error(`Missing template: ${name}`);
  }
  return template;
}

function actionTypes(template: Template) {
  return template.nodes
    .map((node) => node.data.config?.actionType)
    .filter((value): value is string => typeof value === "string");
}

function executableNodes(template: Template) {
  return template.nodes.filter(
    (node) => node.type === "trigger" || node.type === "action"
  );
}

function unreachableExecutableNodes(template: Template) {
  const bySource = new Map<string, string[]>();
  for (const edge of template.edges) {
    const targets = bySource.get(edge.source) ?? [];
    targets.push(edge.target);
    bySource.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const queue = template.nodes
    .filter((node) => node.type === "trigger")
    .map((node) => node.id);

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || visited.has(id)) {
      continue;
    }
    visited.add(id);
    for (const target of bySource.get(id) ?? []) {
      queue.push(target);
    }
  }

  return executableNodes(template).filter((node) => !visited.has(node.id));
}

function conditionOutgoingEdges(template: Template) {
  const conditionIds = new Set(
    template.nodes
      .filter((node) => node.data.config?.actionType === "Condition")
      .map((node) => node.id)
  );
  return template.edges.filter((edge) => conditionIds.has(edge.source));
}

function hasEdge(
  template: Template,
  source: string,
  target: string,
  sourceHandle?: string
) {
  return template.edges.some(
    (edge) =>
      edge.source === source &&
      edge.target === target &&
      (sourceHandle === undefined || edge.sourceHandle === sourceHandle)
  );
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

  it("connect every executable node from the trigger and wire condition true/false handles", () => {
    const templates = loadInMemoryWorkflowTemplates().filter((template) =>
      (STARRED_NAMES as readonly string[]).includes(template.name)
    );

    for (const template of templates) {
      expect(
        unreachableExecutableNodes(template).map((node) => node.id)
      ).toEqual([]);

      for (const edge of conditionOutgoingEdges(template)) {
        expect(
          edge.sourceHandle === "true" || edge.sourceHandle === "false"
        ).toBe(true);
      }
    }
  });

  it("FPL pays 1st and 2nd from funded true branches and notifies Telegram", () => {
    const fpl = requireTemplate("FPL League Top Two USDC Payouts");
    expect(actionTypes(fpl)).toContain("telegram/send-message");
    expect(hasEdge(fpl, "fpl-gw-finished", "fpl-standings", "true")).toBe(true);
    expect(
      hasEdge(fpl, "fpl-funded-condition", "fpl-pay-first-condition", "true")
    ).toBe(true);
    expect(
      hasEdge(fpl, "fpl-funded-condition", "fpl-pay-second-condition", "true")
    ).toBe(true);
    expect(
      hasEdge(fpl, "fpl-pay-first-condition", "arc-pay-first", "true")
    ).toBe(true);
    expect(
      hasEdge(fpl, "fpl-pay-second-condition", "arc-pay-second", "true")
    ).toBe(true);
    expect(hasEdge(fpl, "arc-pay-first", "fpl-telegram")).toBe(true);
    expect(hasEdge(fpl, "arc-pay-second", "fpl-telegram")).toBe(true);
  });

  it("keeper is a single line through Markets live? into the org wallet", () => {
    const keeper = requireTemplate("Aave Uniswap USDC keeper");
    const types = actionTypes(keeper);
    expect(types).toContain("the-graph/query-subgraph");
    expect(types).toContain("privy/wallet-transfer");
    expect(types).toContain("telegram/send-message");
    expect(types.at(-2)).toBe("privy/wallet-transfer");
    expect(types.at(-1)).toBe("telegram/send-message");
    expect(hasEdge(keeper, "keeper-trigger", "aave-usdc")).toBe(true);
    expect(hasEdge(keeper, "aave-usdc", "uni-usdc-weth")).toBe(true);
    expect(hasEdge(keeper, "uni-usdc-weth", "keeper-markets-live")).toBe(true);
    expect(
      hasEdge(keeper, "keeper-markets-live", "keeper-org-wallet", "true")
    ).toBe(true);

    const configs = keeper.nodes.map((node) => node.data.config ?? {});
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

  it("Stripe payout valid, Uniswap large swap, and Kelp deviation connect to the next step", () => {
    const stripe = requireTemplate("Stripe invoice to Privy USDC settlement");
    const uniswap = requireTemplate("Uniswap V3 large swap alert (subgraph)");
    const kelp = requireTemplate(
      "Kelp rsETH Backing Monitor (Substreams → Supabase)"
    );

    expect(
      hasEdge(stripe, "payout-valid-stripe-settle", "pay-stripe-settle", "true")
    ).toBe(true);
    expect(
      hasEdge(uniswap, "uni-v3-condition", "uni-v3-telegram", "true")
    ).toBe(true);
    expect(
      hasEdge(
        kelp,
        "rseth-sb-deviation-condition",
        "rseth-sb-telegram-alert",
        "true"
      )
    ).toBe(true);
  });
});
