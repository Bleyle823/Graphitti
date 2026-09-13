import type { WorkflowTemplate } from "./normalize-export";

export const TREASURY_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Policy-gated contractor payroll",
    description:
      "Pay allowlisted contractors from the org Privy treasury wallet using wallet-transfer on Base Sepolia.",
    nodes: [
      {
        id: "trigger-payroll",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Run payroll",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-wallet",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "list-payees",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "List payees",
          type: "action",
          config: { actionType: "treasury/list-payees" },
          status: "idle",
        },
      },
      {
        id: "pay-contractor",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Pay contractor",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "10",
            destinationAddress: "0x0000000000000000000000000000000000000001",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "notify",
        type: "action",
        position: { x: 1120, y: 200 },
        data: {
          label: "Payroll complete",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Policy-gated payroll submitted\nStatus: {{@pay-contractor:Pay contractor.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "e1", source: "trigger-payroll", target: "get-wallet" },
      { id: "e2", source: "get-wallet", target: "list-payees" },
      { id: "e3", source: "list-payees", target: "pay-contractor" },
      { id: "e4", source: "pay-contractor", target: "notify" },
    ],
  },
  {
    name: "Quorum vendor bill",
    description:
      "Route a high-value vendor payment through a Privy transfer intent for owner quorum approval.",
    nodes: [
      {
        id: "trigger-vendor",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Submit vendor bill",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-vendor",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "create-intent",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Create transfer intent",
          type: "action",
          config: {
            actionType: "privy/create-transfer-intent",
            walletId: "{{@get-wallet-vendor:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "250",
            destinationAddress: "0x0000000000000000000000000000000000000002",
          },
          status: "idle",
        },
      },
      {
        id: "poll-intent",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Get intent status",
          type: "action",
          config: {
            actionType: "privy/get-intent",
            intentId: "{{@create-intent:Create transfer intent.intent_id}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "ev1", source: "trigger-vendor", target: "get-wallet-vendor" },
      { id: "ev2", source: "get-wallet-vendor", target: "create-intent" },
      { id: "ev3", source: "create-intent", target: "poll-intent" },
    ],
  },
  {
    name: "Fund and park idle cash",
    description:
      "Fund the org treasury from your embedded wallet, then confirm the live Privy wallet-transfer succeeded.",
    nodes: [
      {
        id: "trigger-fund",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Fund treasury",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-personal-fund",
        type: "action",
        position: { x: 240, y: 120 },
        data: {
          label: "Get personal wallet",
          type: "action",
          config: { actionType: "treasury/get-personal-wallet" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-fund",
        type: "action",
        position: { x: 240, y: 280 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "fund-transfer",
        type: "action",
        position: { x: 520, y: 200 },
        data: {
          label: "Fund treasury",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-personal-fund:Get personal wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "25",
            destinationAddress: "{{@get-wallet-fund:Get org wallet.address}}",
            destinationChain: "base_sepolia",
            destinationAsset: "usdc",
            useIntent: "false",
          },
          status: "idle",
          description: "Live Privy funding — embedded wallet to org treasury",
        },
      },
      {
        id: "fund-notify",
        type: "action",
        position: { x: 800, y: 200 },
        data: {
          label: "Funding complete",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Treasury funded via Privy wallet transfer\nStatus: {{@fund-transfer:Fund treasury.status}}\nTx: {{@fund-transfer:Fund treasury.transaction_hash}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "ef1", source: "trigger-fund", target: "get-personal-fund" },
      { id: "ef2", source: "trigger-fund", target: "get-wallet-fund" },
      { id: "ef3", source: "get-personal-fund", target: "fund-transfer" },
      { id: "ef4", source: "get-wallet-fund", target: "fund-transfer" },
      { id: "ef5", source: "fund-transfer", target: "fund-notify" },
    ],
  },
  {
    name: "Inbound balance webhook sweep",
    description:
      "Webhook-triggered treasury monitor that notifies when operating balance changes.",
    nodes: [
      {
        id: "trigger-webhook",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Balance webhook",
          type: "trigger",
          config: { triggerType: "Webhook" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-webhook",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "notify-webhook",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Notify finance",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Treasury balance event received for {{@get-wallet-webhook:Get org wallet.address}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "ew1", source: "trigger-webhook", target: "get-wallet-webhook" },
      { id: "ew2", source: "get-wallet-webhook", target: "notify-webhook" },
    ],
  },
];
