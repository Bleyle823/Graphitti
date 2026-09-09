import type { WorkflowTemplate } from "./normalize-export";

const PRIVY_FINANCIAL_NOTE = {
  label: "Sticky note",
  type: "note" as const,
  config: {
    text: "Best financial flow demo: live Privy wallet actions on Base Sepolia. Connect Wallet first, create an org for treasury flows, fund USDC via faucet, then run. Privy hides bridging, gas, and routing.",
    color: "blue",
    fontSize: "sm",
    textAlign: "left",
  },
  status: "idle" as const,
};

function note(id: string, y: number) {
  return {
    id,
    type: "note" as const,
    dragHandle: ".sticky-note-drag-handle",
    width: 260,
    height: 160,
    position: { x: -300, y },
    data: PRIVY_FINANCIAL_NOTE,
  };
}

export const FINANCIAL_FLOW_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Privy USDC remittance",
    description:
      "Send USDC from the org treasury with one Privy wallet-transfer — no manual chain calls or gas tuning.",
    nodes: [
      note("note-remittance", 200),
      {
        id: "trigger-remittance",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Send remittance",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-remittance",
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
        id: "transfer-remittance",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Send USDC",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-remittance:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "10",
            destinationAddress: "0x0000000000000000000000000000000000000001",
            useIntent: "false",
          },
          status: "idle",
          description: "Live Privy wallet action — same-chain USDC payout",
        },
      },
      {
        id: "notify-remittance",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Remittance sent",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "USDC remittance submitted via Privy\nStatus: {{@transfer-remittance:Send USDC.status}}\nTx: {{@transfer-remittance:Send USDC.transaction_hash}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "r1", source: "trigger-remittance", target: "get-wallet-remittance" },
      {
        id: "r2",
        source: "get-wallet-remittance",
        target: "transfer-remittance",
      },
      { id: "r3", source: "transfer-remittance", target: "notify-remittance" },
    ],
  },
  {
    name: "Privy cross-chain USDC remittance",
    description:
      "Bridge USDC across chains with a single Privy wallet-transfer — destination chain and asset are declarative, not raw bridge contracts.",
    nodes: [
      note("note-cross-chain", 200),
      {
        id: "trigger-bridge",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Cross-chain payout",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-bridge",
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
        id: "bridge-transfer",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Bridge USDC",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-bridge:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "5",
            destinationAddress: "0x0000000000000000000000000000000000000002",
            destinationChain: "ethereum_sepolia",
            destinationAsset: "usdc",
            useIntent: "false",
          },
          status: "idle",
          description: "Privy routes bridging — user sets amount and destination only",
        },
      },
      {
        id: "notify-bridge",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Bridge status",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Cross-chain USDC transfer via Privy\nStatus: {{@bridge-transfer:Bridge USDC.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "b1", source: "trigger-bridge", target: "get-wallet-bridge" },
      { id: "b2", source: "get-wallet-bridge", target: "bridge-transfer" },
      { id: "b3", source: "bridge-transfer", target: "notify-bridge" },
    ],
  },
  {
    name: "Privy fund treasury and pay vendor",
    description:
      "Two-step money movement: fund the org treasury from your embedded wallet, then pay a vendor — both via Privy wallet-transfer.",
    nodes: [
      note("note-fund-pay", 200),
      {
        id: "trigger-fund-pay",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Fund and pay",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-personal",
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
        id: "get-org-fund",
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
        id: "fund-treasury",
        type: "action",
        position: { x: 520, y: 120 },
        data: {
          label: "Fund treasury",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-personal:Get personal wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "50",
            destinationAddress: "{{@get-org-fund:Get org wallet.address}}",
            destinationChain: "base_sepolia",
            destinationAsset: "usdc",
            useIntent: "false",
          },
          status: "idle",
          description: "Live funding flow — embedded wallet to org treasury",
        },
      },
      {
        id: "pay-vendor",
        type: "action",
        position: { x: 800, y: 200 },
        data: {
          label: "Pay vendor",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-org-fund:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "25",
            destinationAddress: "0x0000000000000000000000000000000000000003",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "notify-fund-pay",
        type: "action",
        position: { x: 1080, y: 200 },
        data: {
          label: "Payment complete",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Fund + pay complete\nFund: {{@fund-treasury:Fund treasury.status}}\nVendor: {{@pay-vendor:Pay vendor.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "fp1", source: "trigger-fund-pay", target: "get-personal" },
      { id: "fp2", source: "trigger-fund-pay", target: "get-org-fund" },
      { id: "fp3", source: "get-personal", target: "fund-treasury" },
      { id: "fp4", source: "get-org-fund", target: "fund-treasury" },
      { id: "fp5", source: "fund-treasury", target: "pay-vendor" },
      { id: "fp6", source: "pay-vendor", target: "notify-fund-pay" },
    ],
  },
  {
    name: "Privy stablecoin rebalance swap",
    description:
      "Rebalance treasury assets with Privy wallet-swap — one action instead of DEX routing and approvals.",
    nodes: [
      note("note-swap", 200),
      {
        id: "trigger-swap",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Rebalance",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-swap",
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
        id: "swap-assets",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Swap assets",
          type: "action",
          config: {
            actionType: "privy/wallet-swap",
            walletId: "{{@get-wallet-swap:Get org wallet.walletId}}",
            chain: "base_sepolia",
            fromAsset: "usdc",
            toAsset: "eth",
            amount: "10",
          },
          status: "idle",
          description:
            "Set fromAsset/toAsset for your Privy-enabled pair (e.g. USDC/ETH)",
        },
      },
      {
        id: "notify-swap",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Swap submitted",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Treasury rebalance via Privy swap\nStatus: {{@swap-assets:Swap assets.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "s1", source: "trigger-swap", target: "get-wallet-swap" },
      { id: "s2", source: "get-wallet-swap", target: "swap-assets" },
      { id: "s3", source: "swap-assets", target: "notify-swap" },
    ],
  },
  {
    name: "Privy webhook vendor payout",
    description:
      "Webhook-triggered B2B payout: resolve treasury wallet and send USDC when finance receives an invoice event.",
    nodes: [
      note("note-webhook", 200),
      {
        id: "trigger-invoice",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Invoice webhook",
          type: "trigger",
          config: { triggerType: "Webhook" },
          status: "idle",
        },
      },
      {
        id: "get-wallet-invoice",
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
        id: "pay-invoice",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Pay invoice",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-invoice:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "100",
            destinationAddress: "0x0000000000000000000000000000000000000004",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "notify-invoice",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Notify AP",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Vendor paid via Privy wallet transfer\nStatus: {{@pay-invoice:Pay invoice.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "w1", source: "trigger-invoice", target: "get-wallet-invoice" },
      { id: "w2", source: "get-wallet-invoice", target: "pay-invoice" },
      { id: "w3", source: "pay-invoice", target: "notify-invoice" },
    ],
  },
  {
    name: "Privy batch contractor payouts",
    description:
      "Scheduled payroll: three parallel USDC transfers from the org treasury — Privy wallet actions replace raw RPC sends.",
    nodes: [
      note("note-batch", 80),
      {
        id: "trigger-batch",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Monthly payroll",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "0 9 1 * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
        },
      },
      {
        id: "get-wallet-batch",
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
        id: "pay-contractor-a",
        type: "action",
        position: { x: 560, y: 40 },
        data: {
          label: "Pay contractor A",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-batch:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "500",
            destinationAddress: "0x000000000000000000000000000000000000000a",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "pay-contractor-b",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Pay contractor B",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-batch:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "750",
            destinationAddress: "0x000000000000000000000000000000000000000b",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "pay-contractor-c",
        type: "action",
        position: { x: 560, y: 360 },
        data: {
          label: "Pay contractor C",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@get-wallet-batch:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "600",
            destinationAddress: "0x000000000000000000000000000000000000000c",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "notify-batch",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Payroll summary",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Batch payroll via Privy\nA: {{@pay-contractor-a:Pay contractor A.status}}\nB: {{@pay-contractor-b:Pay contractor B.status}}\nC: {{@pay-contractor-c:Pay contractor C.status}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "bp1", source: "trigger-batch", target: "get-wallet-batch" },
      { id: "bp2", source: "get-wallet-batch", target: "pay-contractor-a" },
      { id: "bp3", source: "get-wallet-batch", target: "pay-contractor-b" },
      { id: "bp4", source: "get-wallet-batch", target: "pay-contractor-c" },
      { id: "bp5", source: "pay-contractor-a", target: "notify-batch" },
      { id: "bp6", source: "pay-contractor-b", target: "notify-batch" },
      { id: "bp7", source: "pay-contractor-c", target: "notify-batch" },
    ],
  },
];
