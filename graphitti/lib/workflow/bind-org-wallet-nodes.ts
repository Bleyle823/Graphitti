export const GET_ORG_WALLET_ACTION = "treasury/get-org-wallet";
export const GET_PERSONAL_WALLET_ACTION = "treasury/get-personal-wallet";

export type OrgTreasuryBinding = {
  privyWalletId: string;
  address: string;
};

type WorkflowNodeLike = {
  data?: {
    label?: string;
    config?: Record<string, unknown>;
  };
};

export function isUnresolvedWalletId(walletId: unknown): boolean {
  if (typeof walletId !== "string" || walletId.trim() === "") {
    return true;
  }

  const value = walletId.trim();
  if (value.includes("{{")) {
    return false;
  }

  return (
    value.startsWith("wallet_YOUR") ||
    value.includes("PAYROLL_WALLET") ||
    value === "wallet_..." ||
    value === "wallet_abc123"
  );
}

export function workflowUsesOrgWallet(nodes: unknown[]): boolean {
  return nodes.some((node) => {
    const config = (node as WorkflowNodeLike).data?.config;
    const actionType = config?.actionType;
    if (
      actionType === GET_ORG_WALLET_ACTION ||
      actionType === "treasury/list-payees"
    ) {
      return true;
    }
    if (
      typeof config?.walletId === "string" &&
      config.walletId.includes("Get org wallet")
    ) {
      return true;
    }
    return (
      typeof actionType === "string" &&
      actionType.startsWith("privy/") &&
      isUnresolvedWalletId(config?.walletId)
    );
  });
}

export function applyOrgWalletToNodes<T extends WorkflowNodeLike>(
  nodes: T[],
  treasury: OrgTreasuryBinding
): { nodes: T[]; changed: boolean } {
  let changed = false;

  const next = nodes.map((node) => {
    const config = node.data?.config;
    if (!config) {
      return node;
    }

    const patch: Record<string, unknown> = {};
    if (config.actionType === GET_ORG_WALLET_ACTION) {
      if (config.connectedWalletId !== treasury.privyWalletId) {
        patch.connectedWalletId = treasury.privyWalletId;
      }
      if (config.connectedAddress !== treasury.address) {
        patch.connectedAddress = treasury.address;
      }
    }
    if ("walletId" in config && isUnresolvedWalletId(config.walletId)) {
      patch.walletId = treasury.privyWalletId;
    }

    if (Object.keys(patch).length === 0) {
      return node;
    }

    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...config,
          ...patch,
        },
      },
    };
  });

  return { nodes: next, changed };
}

export function clearOrgWalletFromNodes<T extends WorkflowNodeLike>(
  nodes: T[],
  treasury: OrgTreasuryBinding
): { nodes: T[]; changed: boolean } {
  let changed = false;

  const next = nodes.map((node) => {
    const config = node.data?.config;
    if (!config) {
      return node;
    }

    const patch: Record<string, unknown> = {};
    if (config.actionType === GET_ORG_WALLET_ACTION) {
      if (config.connectedWalletId) {
        patch.connectedWalletId = "";
      }
      if (config.connectedAddress) {
        patch.connectedAddress = "";
      }
    }

    if ("walletId" in config && typeof config.walletId === "string") {
      const walletId = config.walletId.trim();
      if (
        walletId === treasury.privyWalletId ||
        walletId.includes("Get org wallet")
      ) {
        patch.walletId = "";
      }
    }

    if (Object.keys(patch).length === 0) {
      return node;
    }

    changed = true;
    return {
      ...node,
      data: {
        ...node.data,
        config: {
          ...config,
          ...patch,
        },
      },
    };
  });

  return { nodes: next, changed };
}

export function orgWalletTemplate(
  nodeId: string,
  label: string,
  field = "walletId"
): string {
  return `{{@${nodeId}:${label || "Get org wallet"}.${field}}}`;
}

export function personalWalletTemplate(
  nodeId: string,
  label: string,
  field = "walletId"
): string {
  return `{{@${nodeId}:${label || "Get personal wallet"}.${field}}}`;
}

type WalletBindingEdge = {
  source: string;
  target: string;
};

type WalletBindingNode = WorkflowNodeLike & { id?: string };

export function resolveWalletIdBinding(input: {
  nodes: WalletBindingNode[];
  edges: WalletBindingEdge[];
  currentNodeId?: string;
  treasury: { privyWalletId: string } | null;
  personalWalletId: string | null;
}): string | null {
  const findNode = (nodeId: string) =>
    input.nodes.find((node) => node.id === nodeId);

  if (input.currentNodeId) {
    for (const edge of input.edges) {
      if (edge.target !== input.currentNodeId) {
        continue;
      }
      const sourceNode = findNode(edge.source);
      const actionType = sourceNode?.data?.config?.actionType;
      if (actionType === GET_ORG_WALLET_ACTION && sourceNode?.id) {
        return orgWalletTemplate(
          sourceNode.id,
          sourceNode.data?.label || "Get org wallet"
        );
      }
      if (actionType === GET_PERSONAL_WALLET_ACTION && sourceNode?.id) {
        return personalWalletTemplate(
          sourceNode.id,
          sourceNode.data?.label || "Get personal wallet"
        );
      }
    }
  }

  const orgNode = input.nodes.find(
    (node) => node.data?.config?.actionType === GET_ORG_WALLET_ACTION
  );
  const personalNode = input.nodes.find(
    (node) => node.data?.config?.actionType === GET_PERSONAL_WALLET_ACTION
  );

  if (orgNode?.id && !personalNode?.id) {
    return orgWalletTemplate(
      orgNode.id,
      orgNode.data?.label || "Get org wallet"
    );
  }
  if (personalNode?.id && !orgNode?.id) {
    return personalWalletTemplate(
      personalNode.id,
      personalNode.data?.label || "Get personal wallet"
    );
  }
  if (personalNode?.id) {
    return personalWalletTemplate(
      personalNode.id,
      personalNode.data?.label || "Get personal wallet"
    );
  }
  if (orgNode?.id && input.treasury?.privyWalletId) {
    return orgWalletTemplate(
      orgNode.id,
      orgNode.data?.label || "Get org wallet"
    );
  }

  return input.personalWalletId;
}
