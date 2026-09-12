import type { WorkflowTemplate } from "./normalize-export";

export const PLUGIN_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "USDC Whale and Balance Watch",
    description:
      "Poll Token API balances and recent transfers every 15 minutes. Alerts Discord when USDC drops below a threshold or a large transfer is detected.",
    nodes: [
      {
        id: "trigger-graph-watch",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Every 15 Minutes",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "*/15 * * * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
          description: "Poll treasury USDC activity",
        },
      },
      {
        id: "note-graph-watch",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 220,
        height: 140,
        position: { x: -280, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect The Graph and Discord integrations. Set treasury address on balance and transfer nodes.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "graph-balances",
        type: "action",
        position: { x: 300, y: 120 },
        data: {
          label: "Get USDC Balances",
          type: "action",
          config: {
            actionType: "the-graph/get-token-balances",
            network: "mainnet",
            address: "0xYOUR_TREASURY_ADDRESS",
          },
          status: "idle",
          description: "Token API balances for treasury",
        },
      },
      {
        id: "graph-transfers",
        type: "action",
        position: { x: 300, y: 280 },
        data: {
          label: "Get Recent Transfers",
          type: "action",
          config: {
            actionType: "the-graph/get-token-transfers",
            network: "mainnet",
            address: "0xYOUR_TREASURY_ADDRESS",
            age: "1",
          },
          status: "idle",
          description: "Recent ERC-20 transfers",
        },
      },
      {
        id: "graph-low-balance",
        type: "action",
        position: { x: 600, y: 120 },
        data: {
          label: "Balance Below Threshold?",
          type: "action",
          config: {
            actionType: "Condition",
            condition: '{{@graph-balances:Get USDC Balances.result}} !== ""',
          },
          status: "idle",
          description: "Tune condition after inspecting Token API shape",
        },
      },
      {
        id: "graph-alert-balance",
        type: "action",
        position: { x: 900, y: 120 },
        data: {
          label: "Balance Alert",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "TREASURY USDC WATCH\n\nBalances: {{@graph-balances:Get USDC Balances.result}}\nRecent transfers: {{@graph-transfers:Get Recent Transfers.result}}",
          },
          status: "idle",
        },
      },
      {
        id: "graph-alert-activity",
        type: "action",
        position: { x: 900, y: 280 },
        data: {
          label: "Transfer Activity Alert",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "USDC transfer activity detected for {{@graph-transfers:Get Recent Transfers.address}}:\n{{@graph-transfers:Get Recent Transfers.result}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-graph-1",
        source: "trigger-graph-watch",
        target: "graph-balances",
      },
      {
        id: "e-graph-2",
        source: "trigger-graph-watch",
        target: "graph-transfers",
      },
      {
        id: "e-graph-3",
        source: "graph-balances",
        target: "graph-low-balance",
      },
      {
        id: "e-graph-4",
        source: "graph-low-balance",
        target: "graph-alert-balance",
        sourceHandle: "true",
      },
      {
        id: "e-graph-5",
        source: "graph-transfers",
        target: "graph-alert-activity",
      },
    ],
  },
  {
    name: "Circle CCTP USDC to Arc",
    description:
      "Manual CCTP V2 flow: burn USDC on Base, fetch Iris attestation, mint on Arc Testnet, then notify Discord.",
    nodes: [
      {
        id: "trigger-circle-cctp",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Manual Trigger",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "note-circle-cctp",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 220,
        height: 140,
        position: { x: -280, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Circle and Discord. Requires linked Privy wallet for burn/mint writes.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "circle-burn",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Deposit for Burn",
          type: "action",
          config: {
            actionType: "circle/deposit-for-burn",
            network: "base",
            destinationNetwork: "arc-testnet",
            amount: "10",
            mintRecipient: "0xYOUR_ARC_RECIPIENT",
            tokenSymbol: "USDC",
            transferSpeed: "fast",
          },
          status: "idle",
        },
      },
      {
        id: "circle-attestation",
        type: "action",
        position: { x: 600, y: 200 },
        data: {
          label: "Get Iris Attestation",
          type: "action",
          config: {
            actionType: "circle/get-iris-attestation",
            transactionHash: "{{@circle-burn:Deposit for Burn.hash}}",
            network: "base",
          },
          status: "idle",
        },
      },
      {
        id: "circle-mint",
        type: "action",
        position: { x: 900, y: 200 },
        data: {
          label: "Receive Mint",
          type: "action",
          config: {
            actionType: "circle/receive-mint",
            network: "arc-testnet",
            message:
              "{{@circle-attestation:Get Iris Attestation.data.message}}",
            attestation:
              "{{@circle-attestation:Get Iris Attestation.data.attestation}}",
          },
          status: "idle",
        },
      },
      {
        id: "circle-discord",
        type: "action",
        position: { x: 1200, y: 200 },
        data: {
          label: "Bridge Complete",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "CCTP bridge complete\nBurn: {{@circle-burn:Deposit for Burn.hash}}\nMint: {{@circle-mint:Receive Mint.hash}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "e-cctp-1", source: "trigger-circle-cctp", target: "circle-burn" },
      { id: "e-cctp-2", source: "circle-burn", target: "circle-attestation" },
      {
        id: "e-cctp-3",
        source: "circle-attestation",
        target: "circle-mint",
      },
      { id: "e-cctp-4", source: "circle-mint", target: "circle-discord" },
    ],
  },
  {
    name: "Arc USDC Inbound then Swap",
    description:
      "Estimate and bridge USDC to Arc Testnet, then swap USDC to EURC on Arc with a Discord confirmation.",
    nodes: [
      {
        id: "trigger-arc-swap",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Manual Trigger",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "note-arc-swap",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 220,
        height: 140,
        position: { x: -280, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Arc and Discord integrations. Set bridge amount and recipient.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "arc-estimate",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Estimate Bridge",
          type: "action",
          config: {
            actionType: "arc/estimate-bridge",
            fromNetwork: "base",
            toNetwork: "arc-testnet",
            amount: "25",
            transferSpeed: "fast",
          },
          status: "idle",
        },
      },
      {
        id: "arc-bridge",
        type: "action",
        position: { x: 600, y: 200 },
        data: {
          label: "Bridge USDC",
          type: "action",
          config: {
            actionType: "arc/bridge-usdc",
            fromNetwork: "base",
            toNetwork: "arc-testnet",
            amount: "25",
            recipient: "0xYOUR_ARC_WALLET",
            transferSpeed: "fast",
          },
          status: "idle",
        },
      },
      {
        id: "arc-swap",
        type: "action",
        position: { x: 900, y: 200 },
        data: {
          label: "Swap USDC to EURC",
          type: "action",
          config: {
            actionType: "arc/swap-on-arc",
            fromToken: "USDC",
            toToken: "EURC",
            amount: "10",
          },
          status: "idle",
        },
      },
      {
        id: "arc-discord",
        type: "action",
        position: { x: 1200, y: 200 },
        data: {
          label: "Swap Confirmation",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "Arc bridge + swap\nBridge tx: {{@arc-bridge:Bridge USDC.hash}}\nSwap quote: {{@arc-swap:Swap USDC to EURC.quote}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "e-arc-1", source: "trigger-arc-swap", target: "arc-estimate" },
      { id: "e-arc-2", source: "arc-estimate", target: "arc-bridge" },
      { id: "e-arc-3", source: "arc-bridge", target: "arc-swap" },
      { id: "e-arc-4", source: "arc-swap", target: "arc-discord" },
    ],
  },
  {
    name: "Privy Gasless Payroll",
    description:
      "Monthly gasless native transfers from a Privy server wallet to three contractors, with Telegram confirmation.",
    nodes: [
      {
        id: "trigger-privy-payroll",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Monthly Payroll",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "0 0 1 * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
        },
      },
      {
        id: "note-privy-payroll",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 220,
        height: 140,
        position: { x: -280, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Privy and Telegram. Set wallet ID on transfer nodes after creating a Privy wallet. Set chat ID on Send Telegram confirmation.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "privy-wallet",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "List Privy Wallets",
          type: "action",
          config: { actionType: "privy/list-wallets" },
          status: "idle",
        },
      },
      {
        id: "privy-pay-1",
        type: "action",
        position: { x: 600, y: 80 },
        data: {
          label: "Pay Contractor 1",
          type: "action",
          config: {
            actionType: "privy/transfer",
            walletId: "wallet_YOUR_PAYROLL_WALLET",
            network: "base",
            to: "0xCONTRACTOR_1_ADDRESS",
            amount: "0.01",
          },
          status: "idle",
        },
      },
      {
        id: "privy-pay-2",
        type: "action",
        position: { x: 600, y: 200 },
        data: {
          label: "Pay Contractor 2",
          type: "action",
          config: {
            actionType: "privy/transfer",
            walletId: "wallet_YOUR_PAYROLL_WALLET",
            network: "base",
            to: "0xCONTRACTOR_2_ADDRESS",
            amount: "0.01",
          },
          status: "idle",
        },
      },
      {
        id: "privy-pay-3",
        type: "action",
        position: { x: 600, y: 320 },
        data: {
          label: "Pay Contractor 3",
          type: "action",
          config: {
            actionType: "privy/transfer",
            walletId: "wallet_YOUR_PAYROLL_WALLET",
            network: "base",
            to: "0xCONTRACTOR_3_ADDRESS",
            amount: "0.01",
          },
          status: "idle",
        },
      },
      {
        id: "privy-telegram",
        type: "action",
        position: { x: 900, y: 200 },
        data: {
          label: "Send Telegram confirmation",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Privy gasless payroll sent\nC1: {{@privy-pay-1:Pay Contractor 1.hash}}\nC2: {{@privy-pay-2:Pay Contractor 2.hash}}\nC3: {{@privy-pay-3:Pay Contractor 3.hash}}",
            parseMode: "none",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-privy-1",
        source: "trigger-privy-payroll",
        target: "privy-wallet",
      },
      {
        id: "e-privy-2",
        source: "privy-wallet",
        target: "privy-pay-1",
      },
      {
        id: "e-privy-3",
        source: "privy-wallet",
        target: "privy-pay-2",
      },
      {
        id: "e-privy-4",
        source: "privy-wallet",
        target: "privy-pay-3",
      },
      {
        id: "e-privy-5",
        source: "privy-pay-1",
        target: "privy-telegram",
      },
      {
        id: "e-privy-6",
        source: "privy-pay-2",
        target: "privy-telegram",
      },
      {
        id: "e-privy-7",
        source: "privy-pay-3",
        target: "privy-telegram",
      },
    ],
  },
  {
    name: "Uniswap V3 large swap alert (subgraph)",
    description:
      "Every 15 minutes, query the public Uniswap V3 Ethereum subgraph for recent swaps above a USD threshold and Telegram-alert treasury or ops.",
    nodes: [
      {
        id: "uni-v3-schedule",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Every 15 minutes",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "*/15 * * * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
        },
      },
      {
        id: "uni-v3-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 320,
        height: 260,
        position: { x: -360, y: 80 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect The Graph (gateway API key) and Telegram. Paste the public Uniswap V3 Ethereum subgraph id from thegraph.com/explorer on Query Uniswap V3 (default is a common mainnet deployment). Tune amountUSD_gt in the GraphQL query and the Large swap found? condition. Polls every 15 minutes — no custom indexer required.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "uni-v3-query",
        type: "action",
        position: { x: 320, y: 200 },
        data: {
          label: "Query Uniswap V3",
          type: "action",
          config: {
            actionType: "the-graph/query-subgraph",
            id: "DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp",
            query: `query RecentLargeSwaps {
  swaps(
    first: 5
    orderBy: timestamp
    orderDirection: desc
    where: { amountUSD_gt: "100000" }
  ) {
    id
    timestamp
    amountUSD
    token0 { symbol }
    token1 { symbol }
    transaction { id }
  }
}`,
          },
          status: "idle",
          description:
            "Recent swaps with amountUSD > 100k (adjust where clause in GraphQL)",
        },
      },
      {
        id: "uni-v3-condition",
        type: "action",
        position: { x: 640, y: 200 },
        data: {
          label: "Large swap found?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              'String({{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}} || "").length > 0',
          },
          status: "idle",
          description: "True when the query returned at least one large swap",
        },
      },
      {
        id: "uni-v3-telegram",
        type: "action",
        position: { x: 960, y: 200 },
        data: {
          label: "Send Telegram alert",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Uniswap V3 large swap\n\nSwap: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}}\nUSD: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.amountUSD}}\nPair: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.token0.symbol}}/{{@uni-v3-query:Query Uniswap V3.data.swaps.0.token1.symbol}}\nTx: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.transaction.id}}",
            parseMode: "none",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-uni-v3-1",
        source: "uni-v3-schedule",
        target: "uni-v3-query",
      },
      {
        id: "e-uni-v3-2",
        source: "uni-v3-query",
        target: "uni-v3-condition",
      },
      {
        id: "e-uni-v3-3",
        source: "uni-v3-condition",
        target: "uni-v3-telegram",
        sourceHandle: "true",
      },
    ],
  },
];
