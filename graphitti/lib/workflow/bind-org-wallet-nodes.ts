export const GET_ORG_WALLET_ACTION = "treasury/get-org-wallet";

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

export function orgWalletTemplate(
  nodeId: string,
  label: string,
  field = "walletId"
): string {
  return `{{@${nodeId}:${label || "Get org wallet"}.${field}}}`;
}
