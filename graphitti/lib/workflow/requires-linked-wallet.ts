type WorkflowNodeLike = {
  data?: {
    config?: Record<string, unknown>;
  };
};

const PERSONAL_WALLET_ACTION_PREFIXES = [
  "privy/",
  "web3/",
  "circle/",
  "arc/",
] as const;

const PERSONAL_WALLET_ACTIONS = new Set([
  "treasury/get-personal-wallet",
]);

export function workflowRequiresLinkedWallet(
  nodes: WorkflowNodeLike[]
): boolean {
  return nodes.some((node) => {
    const actionType = node.data?.config?.actionType;
    if (typeof actionType !== "string") {
      return false;
    }
    if (PERSONAL_WALLET_ACTIONS.has(actionType)) {
      return true;
    }
    return PERSONAL_WALLET_ACTION_PREFIXES.some((prefix) =>
      actionType.startsWith(prefix)
    );
  });
}
