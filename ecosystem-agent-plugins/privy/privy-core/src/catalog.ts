import {
  privyAddPayee,
  privyApproveTreasuryIntent,
  privyCallWorkflow,
  privyCreateTreasuryIntent,
  privyExecuteWorkflow,
  privyGetExecution,
  privyGetLinkedWallet,
  privyGetListing,
  privyGetTreasury,
  privyGetTreasuryIntent,
  privyListPayees,
  privySearchWorkflows,
  privyWhoami,
} from "./graphitti-actions.js";
import {
  privyCreateKeyQuorum,
  privyCreatePolicy,
  privyCreateRpcIntent,
  privyCreateTransferIntent,
  privyCreateWallet,
  privyGetBalance,
  privyGetIntent,
  privyGetKeyQuorum,
  privyGetPolicy,
  privyGetTransaction,
  privyGetUser,
  privyGetWallet,
  privyGetWalletByAddress,
  privyListIntents,
  privyListUsers,
  privyListWallets,
  privySendTransaction,
  privySignMessage,
  privySignTypedData,
  privyTransfer,
  privyWalletSwap,
  privyWalletTransfer,
} from "./native-actions.js";
import type { ExecuteParams, PrivyCredentials, PrivyToolDefinition, ToolResult } from "./types.js";

export type ToolHandler = (
  params: ExecuteParams,
  credentials: PrivyCredentials
) => Promise<ToolResult>;

const walletIdProp = { type: "string", description: "Privy wallet ID (wallet_...)" };
const networkProp = { type: "string", description: "Network (ethereum, base, base_sepolia, ...)" };

export const PRIVY_TOOL_HANDLERS: Record<string, ToolHandler> = {
  privy_get_user: privyGetUser,
  privy_list_users: privyListUsers,
  privy_list_wallets: privyListWallets,
  privy_create_wallet: privyCreateWallet,
  privy_get_wallet: privyGetWallet,
  privy_get_wallet_by_address: privyGetWalletByAddress,
  privy_get_balance: privyGetBalance,
  privy_get_transaction: privyGetTransaction,
  privy_sign_message: privySignMessage,
  privy_sign_typed_data: privySignTypedData,
  privy_send_transaction: privySendTransaction,
  privy_transfer: privyTransfer,
  privy_wallet_transfer: privyWalletTransfer,
  privy_wallet_swap: privyWalletSwap,
  privy_create_policy: privyCreatePolicy,
  privy_get_policy: privyGetPolicy,
  privy_create_key_quorum: privyCreateKeyQuorum,
  privy_get_key_quorum: privyGetKeyQuorum,
  privy_create_transfer_intent: privyCreateTransferIntent,
  privy_create_rpc_intent: privyCreateRpcIntent,
  privy_get_intent: privyGetIntent,
  privy_list_intents: privyListIntents,
  privy_whoami: privyWhoami,
  privy_search_workflows: privySearchWorkflows,
  privy_get_listing: privyGetListing,
  privy_call_workflow: privyCallWorkflow,
  privy_execute_workflow: privyExecuteWorkflow,
  privy_get_execution: privyGetExecution,
  privy_get_linked_wallet: privyGetLinkedWallet,
  privy_get_treasury: privyGetTreasury,
  privy_list_payees: privyListPayees,
  privy_add_payee: privyAddPayee,
  privy_create_treasury_intent: privyCreateTreasuryIntent,
  privy_get_treasury_intent: privyGetTreasuryIntent,
  privy_approve_treasury_intent: privyApproveTreasuryIntent,
};

export const PRIVY_TOOLS: PrivyToolDefinition[] = [
  {
    name: "privy_get_user",
    description: "Fetch a Privy user by ID from api.privy.io.",
    category: "users",
    parameters: {
      type: "object",
      properties: { privy_user_id: { type: "string" } },
      required: ["privy_user_id"],
    },
  },
  {
    name: "privy_list_users",
    description: "Search Privy users by email or identifier.",
    category: "users",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "privy_list_wallets",
    description: "List server wallets in the Privy app.",
    category: "wallets",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "privy_create_wallet",
    description: "Create a new Privy server wallet.",
    category: "wallets",
    optional: true,
    parameters: {
      type: "object",
      properties: { chain_type: { type: "string" } },
    },
  },
  {
    name: "privy_get_wallet",
    description: "Fetch a Privy wallet by wallet ID (native REST).",
    category: "wallets",
    parameters: {
      type: "object",
      properties: { wallet_id: walletIdProp },
      required: ["wallet_id"],
    },
  },
  {
    name: "privy_get_wallet_by_address",
    description: "Find Privy wallets by onchain address.",
    category: "wallets",
    parameters: {
      type: "object",
      properties: { address: { type: "string" } },
      required: ["address"],
    },
  },
  {
    name: "privy_get_balance",
    description: "Read wallet balance from Privy.",
    category: "wallets",
    parameters: {
      type: "object",
      properties: { wallet_id: walletIdProp, asset: { type: "string" } },
      required: ["wallet_id"],
    },
  },
  {
    name: "privy_get_transaction",
    description: "Fetch a Privy wallet transaction by ID.",
    category: "wallets",
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        transaction_id: { type: "string" },
      },
      required: ["wallet_id", "transaction_id"],
    },
  },
  {
    name: "privy_sign_message",
    description: "Sign a message with a Privy wallet.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        message: { type: "string" },
        network: networkProp,
      },
      required: ["wallet_id", "message"],
    },
  },
  {
    name: "privy_sign_typed_data",
    description: "Sign EIP-712 typed data with a Privy wallet.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        typed_data: { type: "string" },
        network: networkProp,
      },
      required: ["wallet_id", "typed_data"],
    },
  },
  {
    name: "privy_send_transaction",
    description: "Send a gas-sponsored transaction from a Privy wallet.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        network: networkProp,
        to: { type: "string" },
        data: { type: "string" },
        value: { type: "string" },
      },
      required: ["wallet_id", "to"],
    },
  },
  {
    name: "privy_transfer",
    description: "Transfer native tokens with Privy gas sponsorship.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        network: networkProp,
        to: { type: "string" },
        amount: { type: "string" },
      },
      required: ["wallet_id", "to", "amount"],
    },
  },
  {
    name: "privy_wallet_transfer",
    description:
      "Direct Privy USDC wallet transfer via api.privy.io. For listed Graphitti payroll flows use privy_call_workflow.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        source_chain: { type: "string" },
        source_asset: { type: "string" },
        amount: { type: "string" },
        destination_address: { type: "string" },
      },
      required: ["wallet_id", "amount", "destination_address", "source_chain", "source_asset"],
    },
  },
  {
    name: "privy_wallet_swap",
    description: "Swap assets via Privy wallet actions API.",
    category: "sign",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        chain: { type: "string" },
        from_asset: { type: "string" },
        to_asset: { type: "string" },
        amount: { type: "string" },
      },
      required: ["wallet_id", "from_asset", "to_asset", "amount"],
    },
  },
  {
    name: "privy_create_policy",
    description: "Create a Privy authorization policy.",
    category: "controls",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        rules_json: { type: "string" },
        owner_id: { type: "string" },
      },
      required: ["name", "rules_json"],
    },
  },
  {
    name: "privy_get_policy",
    description: "Fetch a Privy policy by ID.",
    category: "controls",
    parameters: {
      type: "object",
      properties: { policy_id: { type: "string" } },
      required: ["policy_id"],
    },
  },
  {
    name: "privy_create_key_quorum",
    description: "Create a Privy key quorum for org approvals.",
    category: "controls",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        display_name: { type: "string" },
        authorization_threshold: { type: "string" },
        user_ids_json: { type: "string" },
      },
      required: ["display_name", "authorization_threshold"],
    },
  },
  {
    name: "privy_get_key_quorum",
    description: "Fetch a Privy key quorum by ID.",
    category: "controls",
    parameters: {
      type: "object",
      properties: { quorum_id: { type: "string" } },
      required: ["quorum_id"],
    },
  },
  {
    name: "privy_create_transfer_intent",
    description: "Propose a transfer intent for owner quorum approval.",
    category: "intents",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        source_chain: { type: "string" },
        source_asset: { type: "string" },
        amount: { type: "string" },
        destination_address: { type: "string" },
      },
      required: ["wallet_id", "amount", "destination_address", "source_chain", "source_asset"],
    },
  },
  {
    name: "privy_create_rpc_intent",
    description: "Create an RPC intent for quorum approval.",
    category: "intents",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        wallet_id: walletIdProp,
        rpc_body: { type: "string" },
      },
      required: ["wallet_id", "rpc_body"],
    },
  },
  {
    name: "privy_get_intent",
    description: "Fetch Privy intent status from api.privy.io.",
    category: "intents",
    parameters: {
      type: "object",
      properties: { intent_id: { type: "string" } },
      required: ["intent_id"],
    },
  },
  {
    name: "privy_list_intents",
    description: "List Privy intents, optionally filtered by wallet.",
    category: "intents",
    parameters: {
      type: "object",
      properties: { wallet_id: walletIdProp },
    },
  },
  {
    name: "privy_whoami",
    description: "Graphitti B2B: authenticated user and org when GRAPHITTI_API_KEY is set.",
    category: "graphitti",
    requiresGraphittiKey: true,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "privy_search_workflows",
    description: "Graphitti B2B: search listed workflows (default category privy).",
    category: "graphitti",
    parameters: {
      type: "object",
      properties: { q: { type: "string" }, category: { type: "string" } },
    },
  },
  {
    name: "privy_get_listing",
    description: "Graphitti B2B: get marketplace listing metadata by slug.",
    category: "graphitti",
    parameters: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "privy_call_workflow",
    description:
      "Graphitti B2B: execute a listed payroll/treasury workflow by slug (402 if unpaid).",
    category: "graphitti",
    optional: true,
    parameters: {
      type: "object",
      properties: { slug: { type: "string" }, input: { type: "object" } },
      required: ["slug"],
    },
  },
  {
    name: "privy_execute_workflow",
    description: "Graphitti B2B: execute an owned workflow by id.",
    category: "graphitti",
    optional: true,
    requiresGraphittiKey: true,
    parameters: {
      type: "object",
      properties: { workflow_id: { type: "string" }, input: { type: "object" } },
      required: ["workflow_id"],
    },
  },
  {
    name: "privy_get_execution",
    description: "Graphitti B2B: poll workflow execution status.",
    category: "graphitti",
    requiresGraphittiKey: true,
    parameters: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
    },
  },
  {
    name: "privy_get_linked_wallet",
    description: "Graphitti B2B: read the user's linked embedded wallet.",
    category: "graphitti",
    requiresGraphittiKey: true,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "privy_get_treasury",
    description:
      "Graphitti B2B: org treasury wallet, payees, and recent intents. Not the same as privy_get_wallet.",
    category: "graphitti",
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "privy_list_payees",
    description: "Graphitti B2B: list org treasury payees.",
    category: "graphitti",
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "privy_add_payee",
    description: "Graphitti B2B: add an org treasury payee.",
    category: "graphitti",
    optional: true,
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: {
      type: "object",
      properties: {
        label: { type: "string" },
        address: { type: "string" },
        default_amount_usdc: { type: "string" },
        chain: { type: "string" },
      },
      required: ["label", "address"],
    },
  },
  {
    name: "privy_create_treasury_intent",
    description: "Graphitti B2B: create an org treasury payment intent.",
    category: "graphitti",
    optional: true,
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: {
      type: "object",
      properties: {
        amount_usdc: { type: "string" },
        to_address: { type: "string" },
        payee_id: { type: "string" },
      },
      required: ["amount_usdc", "to_address"],
    },
  },
  {
    name: "privy_get_treasury_intent",
    description: "Graphitti B2B: read org treasury intent status.",
    category: "graphitti",
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: {
      type: "object",
      properties: { intent_id: { type: "string" } },
      required: ["intent_id"],
    },
  },
  {
    name: "privy_approve_treasury_intent",
    description: "Graphitti B2B: approve and sign an org treasury intent.",
    category: "graphitti",
    optional: true,
    requiresGraphittiKey: true,
    requiresTreasuryScope: true,
    parameters: {
      type: "object",
      properties: { intent_id: { type: "string" } },
      required: ["intent_id"],
    },
  },
];

const GRAPHITTI_NATIVE_PREFIXES = [
  "privy_whoami",
  "privy_search_workflows",
  "privy_get_listing",
  "privy_call_workflow",
  "privy_execute_workflow",
  "privy_get_execution",
  "privy_get_linked_wallet",
  "privy_get_treasury",
  "privy_list_payees",
  "privy_add_payee",
  "privy_create_treasury_intent",
  "privy_get_treasury_intent",
  "privy_approve_treasury_intent",
];

export function listAvailableTools(credentials: PrivyCredentials): PrivyToolDefinition[] {
  return PRIVY_TOOLS.filter((tool) => {
    if (tool.requiresGraphittiKey && !credentials.GRAPHITTI_API_KEY?.trim()) {
      return false;
    }
    return true;
  });
}

export function isGraphittiTool(name: string): boolean {
  return GRAPHITTI_NATIVE_PREFIXES.includes(name);
}

export function getToolDefinition(name: string): PrivyToolDefinition | undefined {
  return PRIVY_TOOLS.find((tool) => tool.name === name);
}
