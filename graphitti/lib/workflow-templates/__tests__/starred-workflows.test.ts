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

function listConditionNodeIds(template: Template) {
  return template.nodes
    .filter((node) => node.data.config?.actionType === "Condition")
    .map((node) => node.id);
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

function hasFalseOutgoing(template: Template, conditionId: string) {
  return template.edges.some(
    (edge) => edge.source === conditionId && edge.sourceHandle === "false"
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

  it("connect every executable node from the trigger and wire condition handles", () => {
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

  it("FPL pays 1st then 2nd sequentially and has false paths for gameweek and pool", () => {
    const fpl = requireTemplate("FPL League Top Two USDC Payouts");
    expect(actionTypes(fpl)).toContain("telegram/send-message");
    expect(hasEdge(fpl, "fpl-gw-finished", "fpl-standings", "true")).toBe(true);
    expect(hasEdge(fpl, "fpl-gw-finished", "fpl-standings", "false")).toBe(
      true
    );
    expect(
      hasEdge(fpl, "fpl-funded-condition", "fpl-pay-first-condition", "true")
    ).toBe(true);
    expect(
      hasEdge(fpl, "fpl-funded-condition", "fpl-pay-second-condition", "true")
    ).toBe(false);
    expect(
      hasEdge(fpl, "fpl-funded-condition", "fpl-underfunded-telegram", "false")
    ).toBe(true);
    const funded = fpl.nodes.find((node) => node.id === "fpl-funded-condition");
    expect(funded?.data.config?.condition).toContain(
      "Number({{@circle-balance:Get Prize Pool USDC.nativeBalance}})"
    );
    expect(funded?.data.config?.condition).not.toContain('Number("{{');
    expect(
      hasEdge(fpl, "fpl-pay-first-condition", "arc-pay-first", "true")
    ).toBe(true);
    expect(
      hasEdge(
        fpl,
        "fpl-pay-first-condition",
        "fpl-pay-second-condition",
        "false"
      )
    ).toBe(true);
    expect(hasEdge(fpl, "arc-pay-first", "fpl-pay-second-condition")).toBe(
      true
    );
    expect(
      hasEdge(fpl, "fpl-pay-second-condition", "arc-pay-second", "true")
    ).toBe(true);
    expect(
      hasEdge(fpl, "fpl-pay-second-condition", "fpl-telegram", "false")
    ).toBe(true);
    expect(hasEdge(fpl, "arc-pay-first", "fpl-telegram")).toBe(false);
    expect(hasEdge(fpl, "arc-pay-second", "fpl-telegram")).toBe(true);
  });

  it("keeper resolves wallets before Markets live and telegrams on both branches", () => {
    const keeper = requireTemplate("Aave Uniswap USDC keeper");
    const types = actionTypes(keeper);
    expect(types).toContain("the-graph/query-subgraph");
    expect(types).toContain("privy/wallet-transfer");
    expect(types).toContain("telegram/send-message");
    expect(types).not.toContain("privy/get-wallet");
    expect(hasEdge(keeper, "keeper-trigger", "aave-usdc")).toBe(true);
    expect(hasEdge(keeper, "aave-usdc", "uni-usdc-weth")).toBe(true);
    expect(hasEdge(keeper, "uni-usdc-weth", "keeper-org-wallet")).toBe(true);
    expect(hasEdge(keeper, "keeper-org-wallet", "keeper-markets-live")).toBe(
      true
    );
    expect(hasEdge(keeper, "keeper-markets-live", "keeper-pay", "true")).toBe(
      true
    );
    expect(
      hasEdge(keeper, "keeper-markets-live", "keeper-telegram-hold", "false")
    ).toBe(true);
    expect(hasEdge(keeper, "keeper-pay", "keeper-telegram")).toBe(true);

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

  it("stripe settlement invoices by email without a separate customer step", () => {
    const stripe = requireTemplate("Stripe invoice to Privy USDC settlement");
    expect(actionTypes(stripe)).not.toContain("stripe/create-customer");
    expect(actionTypes(stripe)).not.toContain("code/run-code");
    expect(actionTypes(stripe)).not.toContain("privy/get-wallet");

    const invoice = stripe.nodes.find(
      (node) => node.data.config?.actionType === "stripe/create-invoice"
    );
    expect(invoice?.data.config?.email).toBeTruthy();
    expect(invoice?.data.config?.customerId).toMatch(/^cus_/);
  });

  it("demo conditions expose false branches with Telegram or transfer follow-ups", () => {
    const stripe = requireTemplate("Stripe invoice to Privy USDC settlement");
    const uniswap = requireTemplate("Uniswap V3 large swap alert (subgraph)");
    const kelp = requireTemplate(
      "Kelp rsETH Backing Monitor (Substreams → Supabase)"
    );

    expect(
      hasEdge(stripe, "payout-valid-stripe-settle", "pay-stripe-settle", "true")
    ).toBe(true);
    expect(
      hasEdge(
        stripe,
        "payout-valid-stripe-settle",
        "telegram-stripe-held",
        "false"
      )
    ).toBe(true);
    expect(
      hasEdge(uniswap, "uni-v3-condition", "uni-v3-telegram", "true")
    ).toBe(true);
    expect(
      hasEdge(uniswap, "uni-v3-condition", "uni-v3-telegram-clear", "false")
    ).toBe(true);
    expect(
      hasEdge(
        kelp,
        "rseth-sb-deviation-condition",
        "rseth-sb-telegram-alert",
        "true"
      )
    ).toBe(true);
    expect(
      hasEdge(
        kelp,
        "rseth-sb-deviation-condition",
        "rseth-sb-telegram-ok",
        "false"
      )
    ).toBe(true);
  });

  it("Arc DeFi treasury readiness is read-only Circle and Arc with both condition branches", () => {
    const arcdefi = requireTemplate("Arc DeFi treasury readiness");
    const types = actionTypes(arcdefi);
    expect(types).toContain("circle/get-usdc-balance");
    expect(types).toContain("circle/get-domains");
    expect(types).toContain("arc/estimate-bridge");
    expect(types).toContain("arc/get-usdc-erc20-balance");
    expect(types).toContain("arc/estimate-swap");
    expect(types).not.toContain("code/run-code");
    expect(
      hasEdge(arcdefi, "arcdefi-ready", "arcdefi-swap-estimate", "true")
    ).toBe(true);
    expect(
      hasEdge(arcdefi, "arcdefi-ready", "arcdefi-telegram-fund", "false")
    ).toBe(true);
    expect(
      hasEdge(arcdefi, "arcdefi-swap-estimate", "arcdefi-telegram-ready")
    ).toBe(true);
  });

  it("payroll batch with intent fallback merges payouts into Telegram", () => {
    const payroll = requireTemplate("Payroll batch with intent fallback");
    expect(actionTypes(payroll)).toContain("privy/create-transfer-intent");
    expect(actionTypes(payroll)).toContain("telegram/send-message");
    expect(actionTypes(payroll)).not.toContain("linear/create-ticket");
    expect(hasEdge(payroll, "small-pay", "large-intent")).toBe(true);
    expect(hasEdge(payroll, "large-intent", "telegram-batch")).toBe(true);
  });

  it("org USDC waterline keeper telegrams on both funded branches", () => {
    const waterline = requireTemplate("Org USDC waterline keeper");
    expect(actionTypes(waterline)).not.toContain("code/run-code");
    expect(actionTypes(waterline)).not.toContain("privy/get-wallet");
    expect(
      hasEdge(waterline, "waterline-funded", "waterline-pay", "true")
    ).toBe(true);
    expect(hasEdge(waterline, "waterline-pay", "waterline-telegram")).toBe(
      true
    );
    expect(
      hasEdge(waterline, "waterline-funded", "waterline-telegram-hold", "false")
    ).toBe(true);
  });

  it("key demo conditions each have a false outgoing edge", () => {
    const checks: Array<{ name: string; conditionId: string }> = [
      {
        name: "Aave Uniswap USDC keeper",
        conditionId: "keeper-markets-live",
      },
      {
        name: "FPL League Top Two USDC Payouts",
        conditionId: "fpl-gw-finished",
      },
      {
        name: "FPL League Top Two USDC Payouts",
        conditionId: "fpl-funded-condition",
      },
      {
        name: "FPL League Top Two USDC Payouts",
        conditionId: "fpl-pay-first-condition",
      },
      {
        name: "FPL League Top Two USDC Payouts",
        conditionId: "fpl-pay-second-condition",
      },
      {
        name: "Stripe invoice to Privy USDC settlement",
        conditionId: "payout-valid-stripe-settle",
      },
      {
        name: "Uniswap V3 large swap alert (subgraph)",
        conditionId: "uni-v3-condition",
      },
      {
        name: "Kelp rsETH Backing Monitor (Substreams → Supabase)",
        conditionId: "rseth-sb-deviation-condition",
      },
      {
        name: "Org USDC waterline keeper",
        conditionId: "waterline-funded",
      },
      {
        name: "Arc DeFi treasury readiness",
        conditionId: "arcdefi-ready",
      },
    ];

    for (const { name, conditionId } of checks) {
      const template = requireTemplate(name);
      expect(listConditionNodeIds(template)).toContain(conditionId);
      expect(hasFalseOutgoing(template, conditionId)).toBe(true);
    }
  });
});
