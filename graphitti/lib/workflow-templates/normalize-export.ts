import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

export type ExportedWorkflowFile = {
  version: number;
  exportedAt?: string;
  workflow: {
    name: string;
    description?: string;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  integrationBindings?: unknown[];
};

export type WorkflowTemplate = {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

const SUSDS_VAULT = "0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD";

function cloneNode(node: WorkflowNode): WorkflowNode {
  return JSON.parse(JSON.stringify(node)) as WorkflowNode;
}

function cloneEdge(edge: WorkflowEdge): WorkflowEdge {
  return JSON.parse(JSON.stringify(edge)) as WorkflowEdge;
}

function normalizeNodeConfig(
  node: WorkflowNode,
  workflowKey: string
): WorkflowNode {
  const next = cloneNode(node);
  const config = { ...(next.data.config ?? {}) } as Record<string, unknown>;
  const actionType = config.actionType as string | undefined;

  if (workflowKey === "sky-savings-dashboard") {
    if (actionType?.startsWith("sky/get-") && config.address !== undefined) {
      config.account = config.address;
      delete config.address;
    }
    if (actionType === "sky/get-susds-balance") {
      config.actionType = "sky/vault-balance";
    }
  }

  if (workflowKey === "sky-usds-auto-deposit-2") {
    if (actionType === "sky/deposit-ssr") {
      config.actionType = "sky/vault-deposit";
      config.network = "1";
      config.assets = config.amount ?? "1000";
      config.receiver = "0xYOUR_WALLET_ADDRESS";
      config.spender = SUSDS_VAULT;
      delete config.amount;
    }
    if (actionType === "sky/approve-usds") {
      config.network = "1";
      config.spender = SUSDS_VAULT;
    }
  }

  if (workflowKey === "monthly-salary") {
    if (config.schedule !== undefined) {
      config.scheduleCron = config.schedule;
      delete config.schedule;
    }
    if (config.toAddress !== undefined) {
      config.recipientAddress = config.toAddress;
      delete config.toAddress;
    }
    delete config.walletId;
  }

  if (workflowKey === "aave-health-factor") {
    if (typeof config.discordMessage === "string") {
      config.discordMessage = config.discordMessage.replace(
        /\{\{step-1\.healthFactor\}\}/g,
        "{{@n6fJJRu9ODKpWqmd1J4s-:Get Aave Health Factor.healthFactor}}"
      );
    }
    if (typeof config.emailBody === "string") {
      config.emailBody = config.emailBody.replace(
        /\{\{step-1\.healthFactor\}\}/g,
        "{{@n6fJJRu9ODKpWqmd1J4s-:Get Aave Health Factor.healthFactor}}"
      );
    }
  }

  delete config.discordWebhookUrl;

  next.data.config = config;
  return next;
}

function integrationNoteText(workflowKey: string): string {
  switch (workflowKey) {
    case "safe-multisig":
      return "Connect Safe and Discord integrations on alert nodes before running.";
    case "aave-health-factor":
      return "Connect Discord and SendGrid integrations. Set the monitored user address on the Aave read node.";
    case "monthly-salary":
      return "Link your Privy wallet (Connect Wallet) before running payroll transfers.";
    default:
      return "Connect Discord integration on notification nodes before running.";
  }
}

function createIntegrationNote(
  workflowKey: string,
  anchorY: number
): WorkflowNode {
  return {
    id: `note-${workflowKey}`,
    type: "note",
    dragHandle: ".sticky-note-drag-handle",
    width: 220,
    height: 140,
    position: { x: -280, y: anchorY },
    data: {
      label: "Sticky note",
      description: "",
      type: "note",
      config: {
        text: integrationNoteText(workflowKey),
        color: "blue",
        fontSize: "sm",
        textAlign: "left",
      },
      status: "idle",
    },
  };
}

export function normalizeExportedWorkflow(
  exported: ExportedWorkflowFile,
  workflowKey: string,
  options?: { addIntegrationNote?: boolean }
): WorkflowTemplate {
  const nodes = exported.nodes.map((node) =>
    normalizeNodeConfig(node, workflowKey)
  );

  if (options?.addIntegrationNote !== false) {
    const anchorY = nodes[0]?.position?.y ?? 200;
    nodes.unshift(createIntegrationNote(workflowKey, anchorY));
  }

  let name = exported.workflow.name.replace(/\s*\(Copy\)\s*$/i, "").trim();
  if (workflowKey === "sky-usds-auto-deposit-2") {
    name = "Sky USDS Savings Auto-Deposit (Weekly)";
  }

  return {
    name,
    description: exported.workflow.description ?? "",
    nodes,
    edges: exported.edges.map(cloneEdge),
  };
}
