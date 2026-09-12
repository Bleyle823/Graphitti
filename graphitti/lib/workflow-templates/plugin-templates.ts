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
            walletId: "zjwbaol9pyxy9llkly163dvn",
            network: "sepolia",
            to: "0xdEBC58A3CE140Ef84E5757013c1998FdAfDB44D6",
            amount: "0.001",
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
            walletId: "zjwbaol9pyxy9llkly163dvn",
            network: "sepolia",
            to: "0xc67c0d1d4e12D838f3ed2fC6241D8e65Dfb3100B",
            amount: "0.001",
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
            walletId: "zjwbaol9pyxy9llkly163dvn",
            network: "sepolia",
            to: "0xe62803A1A219Be5f0D437ed9F84F2e4CDc8A3Ca1",
            amount: "0.001",
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
            text: "Connect The Graph (gateway API key) and Telegram. Set chat ID on both Telegram nodes. Query uses the public Uniswap V3 Ethereum subgraph. Tune amountUSD_gt in the GraphQL query. Every run sends a Telegram report: large-swap alert when a match exists, all-clear when none do.",
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
            id: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
            query: `query RecentLargeSwaps {
  swaps(
    first: 5
    orderBy: timestamp
    orderDirection: desc
    where: { amountUSD_gt: "10000" }
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
            "Recent swaps with amountUSD > 10k (adjust where clause in GraphQL)",
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
              '{{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}} !== undefined && {{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}} !== null && {{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}} !== ""',
          },
          status: "idle",
          description: "True when the query returned at least one large swap",
        },
      },
      {
        id: "uni-v3-telegram",
        type: "action",
        position: { x: 960, y: 80 },
        data: {
          label: "Send Telegram alert",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Uniswap V3 large swap found\n\nSwap: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.id}}\nUSD: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.amountUSD}}\nPair: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.token0.symbol}}/{{@uni-v3-query:Query Uniswap V3.data.swaps.0.token1.symbol}}\nTx: {{@uni-v3-query:Query Uniswap V3.data.swaps.0.transaction.id}}\nAction: review treasury exposure on this pair.",
            parseMode: "none",
          },
          status: "idle",
        },
      },
      {
        id: "uni-v3-telegram-clear",
        type: "action",
        position: { x: 960, y: 320 },
        data: {
          label: "Send all-clear",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Uniswap V3 watch — no large swap this poll\n\nNo swap above $10k USD in the latest Uniswap V3 query. Treasury watch standing by. This is the expected quiet outcome, not a failed run.",
            parseMode: "none",
          },
          status: "idle",
          description: "Heartbeat when no large swap matched the threshold",
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
      {
        id: "e-uni-v3-4",
        source: "uni-v3-condition",
        target: "uni-v3-telegram-clear",
        sourceHandle: "false",
      },
    ],
  },
  {
    name: "Aave Uniswap USDC keeper",
    description:
      "Read Aave V3 USDC utilization and Uniswap V3 USDC/WETH liquidity from public Ethereum subgraphs, then send a keeper USDC buffer from the org Privy treasury and report on Telegram.",
    nodes: [
      {
        id: "keeper-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Aave Uniswap keeper run",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "keeper-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 320,
        height: 200,
        position: { x: -360, y: 120 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect The Graph, Privy, and Telegram. Create an org treasury before running. Subgraph reads are Ethereum mainnet; USDC payout uses Base Sepolia. Markets live? always Telegram-reports: 1 USDC keeper buffer when TVL is positive, hold notice and no transfer when it is not.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "aave-usdc",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Query Aave USDC market",
          type: "action",
          config: {
            actionType: "the-graph/query-subgraph",
            id: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
            query: `query AaveUsdc {
  market(id: "0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c") {
    name
    totalValueLockedUSD
    totalDepositBalanceUSD
    totalBorrowBalanceUSD
    inputToken { symbol }
  }
}`,
          },
          status: "idle",
          description: "Aave V3 Ethereum USDC market (Messari subgraph)",
        },
      },
      {
        id: "uni-usdc-weth",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Query Uniswap USDC/WETH",
          type: "action",
          config: {
            actionType: "the-graph/query-subgraph",
            id: "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
            query: `query UniswapUsdcWeth {
  pool(id: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640") {
    id
    feeTier
    liquidity
    volumeUSD
    totalValueLockedUSD
    token0Price
    token0 { symbol }
    token1 { symbol }
  }
}`,
          },
          status: "idle",
          description: "Uniswap V3 Ethereum USDC/WETH 0.05% pool",
        },
      },
      {
        id: "keeper-org-wallet",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "keeper-markets-live",
        type: "action",
        position: { x: 1120, y: 200 },
        data: {
          label: "Markets live?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@aave-usdc:Query Aave USDC market.data.market.totalValueLockedUSD}} > 0",
          },
          status: "idle",
          description:
            "True when Aave USDC TVL is positive (1 USDC keeper buffer). False still finishes with a Telegram hold report — no transfer.",
        },
      },
      {
        id: "keeper-pay",
        type: "action",
        position: { x: 1400, y: 80 },
        data: {
          label: "Pay keeper USDC",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@keeper-org-wallet:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "1",
            destinationAddress: "0xe53c55806328d94A345f2784c7387495505B1CF1",
            destinationChain: "base_sepolia",
            destinationAsset: "usdc",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "keeper-telegram",
        type: "action",
        position: { x: 1400, y: 80 },
        data: {
          label: "Send Telegram report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Aave Uniswap USDC keeper — markets live\n\nAave USDC TVL: {{@aave-usdc:Query Aave USDC market.data.market.totalValueLockedUSD}}\nAave borrows: {{@aave-usdc:Query Aave USDC market.data.market.totalBorrowBalanceUSD}}\nUniswap pool TVL: {{@uni-usdc-weth:Query Uniswap USDC/WETH.data.pool.totalValueLockedUSD}}\nUSDC per WETH: {{@uni-usdc-weth:Query Uniswap USDC/WETH.data.pool.token0Price}}\nPayout: {{@keeper-pay:Pay keeper USDC.status}}\nTx: {{@keeper-pay:Pay keeper USDC.transaction_hash}}",
            parseMode: "none",
          },
          status: "idle",
        },
      },
      {
        id: "keeper-telegram-hold",
        type: "action",
        position: { x: 1400, y: 320 },
        data: {
          label: "Send hold report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Aave Uniswap USDC keeper — refill held\n\nMarkets did not pass the live TVL check. No USDC transfer was sent.\nLast Aave USDC TVL: {{@aave-usdc:Query Aave USDC market.data.market.totalValueLockedUSD}}\nUniswap pool TVL: {{@uni-usdc-weth:Query Uniswap USDC/WETH.data.pool.totalValueLockedUSD}}\nRun completed on the false branch.",
            parseMode: "none",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      { id: "e-keeper-1", source: "keeper-trigger", target: "aave-usdc" },
      { id: "e-keeper-2", source: "aave-usdc", target: "uni-usdc-weth" },
      {
        id: "e-keeper-3",
        source: "uni-usdc-weth",
        target: "keeper-org-wallet",
      },
      {
        id: "e-keeper-4",
        source: "keeper-org-wallet",
        target: "keeper-markets-live",
      },
      {
        id: "e-keeper-6",
        source: "keeper-markets-live",
        target: "keeper-pay",
        sourceHandle: "true",
      },
      {
        id: "e-keeper-7",
        source: "keeper-markets-live",
        target: "keeper-telegram-hold",
        sourceHandle: "false",
      },
      { id: "e-keeper-8", source: "keeper-pay", target: "keeper-telegram" },
    ],
  },
  {
    name: "Org USDC waterline keeper",
    description:
      "Read the org treasury USDC balance on Base Sepolia. If at least 1 USDC is on hand, send a 1 USDC contractor buffer and Telegram the payout. If the waterline is missed, skip the transfer and Telegram a hold notice so the run always finishes.",
    nodes: [
      {
        id: "waterline-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Treasury waterline run",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "waterline-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 300,
        height: 200,
        position: { x: -340, y: 120 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Circle, Privy, and Telegram. Create an org treasury first. Set Telegram chat ID on both Telegram nodes. Funded? true sends 1 USDC then a payout report. false skips the transfer and sends a hold report so a low balance cannot stall the workflow.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "waterline-org-wallet",
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
        id: "waterline-balance",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Get org USDC",
          type: "action",
          config: {
            actionType: "circle/get-usdc-balance",
            network: "base-sepolia",
            address: "{{@waterline-org-wallet:Get org wallet.address}}",
            tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          },
          status: "idle",
          description: "Base Sepolia USDC on the org treasury address",
        },
      },
      {
        id: "waterline-funded",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Funded above waterline?",
          type: "action",
          config: {
            actionType: "Condition",
            condition: "{{@waterline-balance:Get org USDC.balance}} > 0",
          },
          status: "idle",
          description:
            "True pays a 1 USDC buffer. False still Telegram-reports and completes.",
        },
      },
      {
        id: "waterline-pay",
        type: "action",
        position: { x: 1120, y: 80 },
        data: {
          label: "Pay contractor USDC",
          type: "action",
          config: {
            actionType: "privy/wallet-transfer",
            walletId: "{{@waterline-org-wallet:Get org wallet.walletId}}",
            sourceChain: "base_sepolia",
            sourceAsset: "usdc",
            amount: "1",
            destinationAddress: "0xe53c55806328d94A345f2784c7387495505B1CF1",
            destinationChain: "base_sepolia",
            destinationAsset: "usdc",
            useIntent: "false",
          },
          status: "idle",
        },
      },
      {
        id: "waterline-telegram",
        type: "action",
        position: { x: 1400, y: 80 },
        data: {
          label: "Send payout report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Org USDC waterline — buffer sent\n\nTreasury USDC: {{@waterline-balance:Get org USDC.balance}}\nPayout: {{@waterline-pay:Pay contractor USDC.status}}\nTx: {{@waterline-pay:Pay contractor USDC.transaction_hash}}",
            parseMode: "none",
          },
          status: "idle",
        },
      },
      {
        id: "waterline-telegram-hold",
        type: "action",
        position: { x: 1120, y: 320 },
        data: {
          label: "Send hold report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Org USDC waterline — payout held\n\nTreasury USDC: {{@waterline-balance:Get org USDC.balance}}\nBalance is at or below the waterline. No USDC transfer was sent. Run completed.",
            parseMode: "none",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-waterline-1",
        source: "waterline-trigger",
        target: "waterline-org-wallet",
      },
      {
        id: "e-waterline-2",
        source: "waterline-org-wallet",
        target: "waterline-balance",
      },
      {
        id: "e-waterline-3",
        source: "waterline-balance",
        target: "waterline-funded",
      },
      {
        id: "e-waterline-4",
        source: "waterline-funded",
        target: "waterline-pay",
        sourceHandle: "true",
      },
      {
        id: "e-waterline-5",
        source: "waterline-pay",
        target: "waterline-telegram",
      },
      {
        id: "e-waterline-6",
        source: "waterline-funded",
        target: "waterline-telegram-hold",
        sourceHandle: "false",
      },
    ],
  },
  {
    name: "Arc DeFi treasury readiness",
    description:
      "Preflight before bridging USDC to Arc for swaps or gas: snapshot org USDC on Base Sepolia, read CCTP domains, estimate CCTP fees, check Arc USDC, then Telegram whether the treasury is ready for DeFi or needs funding.",
    nodes: [
      {
        id: "arcdefi-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "DeFi readiness run",
          type: "trigger",
          config: { triggerType: "Manual" },
          status: "idle",
        },
      },
      {
        id: "arcdefi-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 320,
        height: 200,
        position: { x: -360, y: 120 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Circle, Arc, and Telegram. On Base Sepolia USDC set Network to base-sepolia (not Arc Testnet or Ethereum). Address must be {{@arcdefi-org-wallet:Get org wallet.address}}. No onchain writes.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "arcdefi-org-wallet",
        type: "action",
        position: { x: 260, y: 200 },
        data: {
          label: "Get org wallet",
          type: "action",
          config: { actionType: "treasury/get-org-wallet" },
          status: "idle",
        },
      },
      {
        id: "arcdefi-base-usdc",
        type: "action",
        position: { x: 520, y: 200 },
        data: {
          label: "Base Sepolia USDC",
          type: "action",
          config: {
            actionType: "circle/get-usdc-balance",
            network: "base-sepolia",
            address: "{{@arcdefi-org-wallet:Get org wallet.address}}",
            tokenAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          },
          status: "idle",
          description: "Source-chain USDC before CCTP to Arc",
        },
      },
      {
        id: "arcdefi-cctp-domains",
        type: "action",
        position: { x: 780, y: 200 },
        data: {
          label: "CCTP domains",
          type: "action",
          config: { actionType: "circle/get-domains" },
          status: "idle",
        },
      },
      {
        id: "arcdefi-bridge-estimate",
        type: "action",
        position: { x: 1040, y: 200 },
        data: {
          label: "Estimate bridge to Arc",
          type: "action",
          config: {
            actionType: "arc/estimate-bridge",
            fromNetwork: "base-sepolia",
            toNetwork: "arc-testnet",
            amount: "5",
            transferSpeed: "fast",
          },
          status: "idle",
        },
      },
      {
        id: "arcdefi-arc-usdc",
        type: "action",
        position: { x: 1300, y: 200 },
        data: {
          label: "Arc ERC-20 USDC",
          type: "action",
          config: {
            actionType: "arc/get-usdc-erc20-balance",
            address: "{{@arcdefi-org-wallet:Get org wallet.address}}",
          },
          status: "idle",
        },
      },
      {
        id: "arcdefi-ready",
        type: "action",
        position: { x: 1560, y: 200 },
        data: {
          label: "Source USDC funded?",
          type: "action",
          config: {
            actionType: "Condition",
            condition: "{{@arcdefi-base-usdc:Base Sepolia USDC.balance}} > 0",
          },
          status: "idle",
          description:
            "True continues with swap estimate + ready Telegram. False still reports and completes.",
        },
      },
      {
        id: "arcdefi-swap-estimate",
        type: "action",
        position: { x: 1840, y: 80 },
        data: {
          label: "Estimate USDC to EURC",
          type: "action",
          config: {
            actionType: "arc/estimate-swap",
            fromToken: "USDC",
            toToken: "EURC",
            amount: "1",
          },
          status: "idle",
        },
      },
      {
        id: "arcdefi-telegram-ready",
        type: "action",
        position: { x: 2120, y: 80 },
        data: {
          label: "Send ready report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Arc DeFi readiness — GO\n\nBase Sepolia USDC: {{@arcdefi-base-usdc:Base Sepolia USDC.balance}}\nArc ERC-20 USDC: {{@arcdefi-arc-usdc:Arc ERC-20 USDC.balance}}\nBridge finality threshold: {{@arcdefi-bridge-estimate:Estimate bridge to Arc.minFinalityThreshold}}\nNext: run Circle CCTP USDC to Arc or Arc USDC Inbound then Swap when funded.",
            parseMode: "none",
          },
          status: "idle",
        },
      },
      {
        id: "arcdefi-telegram-fund",
        type: "action",
        position: { x: 1840, y: 320 },
        data: {
          label: "Send fund report",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Arc DeFi readiness — fund source chain\n\nBase Sepolia USDC: {{@arcdefi-base-usdc:Base Sepolia USDC.balance}}\nArc ERC-20 USDC: {{@arcdefi-arc-usdc:Arc ERC-20 USDC.balance}}\nTop up Base Sepolia USDC before bridging to Arc for swaps. Run completed.",
            parseMode: "none",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-arcdefi-1",
        source: "arcdefi-trigger",
        target: "arcdefi-org-wallet",
      },
      {
        id: "e-arcdefi-2",
        source: "arcdefi-org-wallet",
        target: "arcdefi-base-usdc",
      },
      {
        id: "e-arcdefi-3",
        source: "arcdefi-base-usdc",
        target: "arcdefi-cctp-domains",
      },
      {
        id: "e-arcdefi-4",
        source: "arcdefi-cctp-domains",
        target: "arcdefi-bridge-estimate",
      },
      {
        id: "e-arcdefi-5",
        source: "arcdefi-bridge-estimate",
        target: "arcdefi-arc-usdc",
      },
      {
        id: "e-arcdefi-6",
        source: "arcdefi-arc-usdc",
        target: "arcdefi-ready",
      },
      {
        id: "e-arcdefi-7",
        source: "arcdefi-ready",
        target: "arcdefi-swap-estimate",
        sourceHandle: "true",
      },
      {
        id: "e-arcdefi-8",
        source: "arcdefi-swap-estimate",
        target: "arcdefi-telegram-ready",
      },
      {
        id: "e-arcdefi-9",
        source: "arcdefi-ready",
        target: "arcdefi-telegram-fund",
        sourceHandle: "false",
      },
    ],
  },
];
