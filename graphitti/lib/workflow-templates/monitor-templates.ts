import type { WorkflowTemplate } from "./normalize-export";

export const MONITOR_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Safe Delegatecall Sentinel",
    description:
      "Poll pending Safe transactions every minute. For each tx, decode calldata, assess risk, and alert Discord on delegatecall (operation 1) or risk score >= 70.",
    nodes: [
      {
        id: "safe-sentinel-schedule",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Every Minute",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "*/1 * * * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
          description: "Poll Safe pending queue",
        },
      },
      {
        id: "safe-sentinel-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 240,
        height: 160,
        position: { x: -300, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Safe + Discord. Set Safe address and network on Get Pending TXs. Alerts on delegatecall or risk score >= 70.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-pending",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Get Pending TXs",
          type: "action",
          config: {
            actionType: "safe/get-pending-transactions",
            safeAddress: "0xYOUR_SAFE_ADDRESS",
            network: "1",
          },
          status: "idle",
          description: "Fetch pending Safe transactions",
        },
      },
      {
        id: "safe-sentinel-has-pending",
        type: "action",
        position: { x: 600, y: 200 },
        data: {
          label: "Has Pending TXs?",
          type: "action",
          config: {
            actionType: "Condition",
            condition: "{{@safe-sentinel-pending:Get Pending TXs.count}} > 0",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-for-each",
        type: "action",
        position: { x: 900, y: 200 },
        data: {
          label: "Each Pending TX",
          type: "action",
          config: {
            actionType: "For Each",
            arraySource:
              "{{@safe-sentinel-pending:Get Pending TXs.transactions}}",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-decode",
        type: "action",
        position: { x: 1200, y: 80 },
        data: {
          label: "Decode Calldata",
          type: "action",
          config: {
            actionType: "web3/decode-calldata",
            network: "1",
            calldata:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.data}}",
            contractAddress:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.to}}",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-assess",
        type: "action",
        position: { x: 1200, y: 200 },
        data: {
          label: "Assess Risk",
          type: "action",
          config: {
            actionType: "web3/assess-risk",
            calldata:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.data}}",
            contractAddress:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.to}}",
            value:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.value}}",
            chain: "1",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-intel",
        type: "action",
        position: { x: 1200, y: 320 },
        data: {
          label: "Graph Intel",
          type: "action",
          config: {
            actionType: "the-graph/find-by-contract",
            contract:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.to}}",
            chain: "mainnet",
          },
          status: "idle",
          description: "Optional subgraph intel for target contract",
        },
      },
      {
        id: "safe-sentinel-alert-condition",
        type: "action",
        position: { x: 1500, y: 200 },
        data: {
          label: "Delegatecall or High Risk?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@safe-sentinel-for-each:Each Pending TX.currentItem.operation}} === 1 || {{@safe-sentinel-assess:Assess Risk.riskScore}} >= 70",
          },
          status: "idle",
        },
      },
      {
        id: "safe-sentinel-discord",
        type: "action",
        position: { x: 1800, y: 200 },
        data: {
          label: "Sentinel Alert",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "SAFE DELEGATECALL SENTINEL\n\nSafe: {{@safe-sentinel-for-each:Each Pending TX.currentItem.safe}}\nTo: {{@safe-sentinel-for-each:Each Pending TX.currentItem.to}}\nOperation: {{@safe-sentinel-for-each:Each Pending TX.currentItem.operationLabel}}\nValue: {{@safe-sentinel-for-each:Each Pending TX.currentItem.value}}\nFunction: {{@safe-sentinel-decode:Decode Calldata.functionName}}\nRisk: {{@safe-sentinel-assess:Assess Risk.riskScore}} ({{@safe-sentinel-assess:Assess Risk.riskLevel}})\nReason: {{@safe-sentinel-assess:Assess Risk.reasoning}}\nGraph intel: {{@safe-sentinel-intel:Graph Intel.count}} subgraph(s)",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-safe-1",
        source: "safe-sentinel-schedule",
        target: "safe-sentinel-pending",
      },
      {
        id: "e-safe-2",
        source: "safe-sentinel-pending",
        target: "safe-sentinel-has-pending",
      },
      {
        id: "e-safe-3",
        source: "safe-sentinel-has-pending",
        target: "safe-sentinel-for-each",
        sourceHandle: "true",
      },
      {
        id: "e-safe-4",
        source: "safe-sentinel-for-each",
        target: "safe-sentinel-decode",
        sourceHandle: "loop",
      },
      {
        id: "e-safe-5",
        source: "safe-sentinel-decode",
        target: "safe-sentinel-assess",
      },
      {
        id: "e-safe-6",
        source: "safe-sentinel-assess",
        target: "safe-sentinel-intel",
      },
      {
        id: "e-safe-7",
        source: "safe-sentinel-intel",
        target: "safe-sentinel-alert-condition",
      },
      {
        id: "e-safe-8",
        source: "safe-sentinel-alert-condition",
        target: "safe-sentinel-discord",
        sourceHandle: "true",
      },
    ],
  },
  {
    name: "Substreams Pull Monitor (subgraph)",
    description:
      "Schedule poll of any Substreams graph_out subgraph via query-substreams-entity. Deploy spkg + subgraph once; workflow never starts gRPC.",
    nodes: [
      {
        id: "substreams-pull-schedule",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Every Minute",
          type: "trigger",
          config: {
            triggerType: "Schedule",
            scheduleCron: "*/1 * * * *",
            scheduleTimezone: "UTC",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-pull-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 260,
        height: 180,
        position: { x: -320, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Deploy Substreams + subgraph externally. Paste subgraph id on Query Entity. Tune entityName, whereJson, and Condition. Run pnpm substreams:deploy-checklist for steps.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-pull-resolve",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Resolve Package",
          type: "action",
          config: {
            actionType: "the-graph/resolve-substreams-package",
            slug: "your-package-slug",
            network: "ethereum",
          },
          status: "idle",
          description: "Optional setup — run manually once",
        },
      },
      {
        id: "substreams-pull-status",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Indexing Status",
          type: "action",
          config: {
            actionType: "the-graph/get-substreams-stream-status",
            id: "YOUR_SUBGRAPH_ID",
          },
          status: "idle",
          description: "Optional — confirm _meta near chain head",
        },
      },
      {
        id: "substreams-pull-query",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "Query Entity",
          type: "action",
          config: {
            actionType: "the-graph/query-substreams-entity",
            id: "YOUR_SUBGRAPH_ID",
            entityName: "streamSnapshots",
            entityFields:
              "id,blockNumber,shouldAlert,deviationBps,triggerEvent,txHash",
            orderBy: "blockNumber",
            orderDirection: "desc",
            first: "5",
            whereJson: '{ "shouldAlert": true }',
            minField: "deviationBps",
            minValue: "50",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-pull-condition",
        type: "action",
        position: { x: 1120, y: 200 },
        data: {
          label: "Should Alert?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@substreams-pull-query:Query Entity.has_match}} === true",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-pull-discord",
        type: "action",
        position: { x: 1400, y: 200 },
        data: {
          label: "Pull Alert",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "SUBSTREAMS PULL ALERT\n\nLatest: {{@substreams-pull-query:Query Entity.latest}}\nIndexed block: {{@substreams-pull-status:Indexing Status.indexed_block_number}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-spull-1",
        source: "substreams-pull-schedule",
        target: "substreams-pull-resolve",
      },
      {
        id: "e-spull-1b",
        source: "substreams-pull-resolve",
        target: "substreams-pull-status",
      },
      {
        id: "e-spull-1c",
        source: "substreams-pull-status",
        target: "substreams-pull-query",
      },
      {
        id: "e-spull-2",
        source: "substreams-pull-query",
        target: "substreams-pull-condition",
      },
      {
        id: "e-spull-3",
        source: "substreams-pull-condition",
        target: "substreams-pull-discord",
        sourceHandle: "true",
      },
    ],
  },
  {
    name: "Substreams Push Alert (webhook)",
    description:
      "Webhook workflow for substreams sink webhook POSTs. Condition on payload fields; lowest latency path.",
    nodes: [
      {
        id: "substreams-push-webhook",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Substreams Webhook",
          type: "trigger",
          config: {
            triggerType: "Webhook",
            webhookMockRequest:
              '{"should_alert":true,"deviation_bps":75,"block_number":"21000000","trigger_event":"Deposit"}',
          },
          status: "idle",
        },
      },
      {
        id: "substreams-push-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 260,
        height: 160,
        position: { x: -320, y: 200 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Use the-graph/substreams-webhook-setup for sink CLI. Run sink 24/7 outside Graphitti. Map payload fields in Condition.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-push-setup",
        type: "action",
        position: { x: 280, y: 80 },
        data: {
          label: "Webhook Setup Helper",
          type: "action",
          config: {
            actionType: "the-graph/substreams-webhook-setup",
            slug: "your-package-slug",
            moduleName: "map_events",
            network: "ethereum",
            baseUrl: "https://YOUR_GRAPHITTI_HOST",
            workflowId: "YOUR_WORKFLOW_ID",
          },
          status: "idle",
          description: "Read-only — copy sink_command",
        },
      },
      {
        id: "substreams-push-condition",
        type: "action",
        position: { x: 300, y: 200 },
        data: {
          label: "Payload Alert?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@substreams-push-webhook:Substreams Webhook.should_alert}} === true",
          },
          status: "idle",
        },
      },
      {
        id: "substreams-push-discord",
        type: "action",
        position: { x: 600, y: 200 },
        data: {
          label: "Push Alert",
          type: "action",
          config: {
            actionType: "discord/send-message",
            discordMessage:
              "SUBSTREAMS PUSH ALERT\n\nBlock: {{@substreams-push-webhook:Substreams Webhook.block_number}}\nDeviation bps: {{@substreams-push-webhook:Substreams Webhook.deviation_bps}}\nEvent: {{@substreams-push-webhook:Substreams Webhook.trigger_event}}",
          },
          status: "idle",
        },
      },
    ],
    edges: [
      {
        id: "e-spush-1",
        source: "substreams-push-webhook",
        target: "substreams-push-condition",
      },
      {
        id: "e-spush-2",
        source: "substreams-push-condition",
        target: "substreams-push-discord",
        sourceHandle: "true",
      },
    ],
  },
  {
    name: "Kelp rsETH Backing Monitor (Substreams → Supabase)",
    description:
      "Detects unbacked rsETH mints by comparing total rsETH circulation across Ethereum mainnet and Arbitrum against verified ETH collateral in the KelpDAO LRTDepositPool. Substreams SQL sinks index live snapshots into Supabase; this workflow reads the latest row every Ethereum block (~12s). Alerts when supply exceeds backing by more than 50 bps (0.5%). Add Supabase credentials in Project Integrations.",
    nodes: [
      {
        id: "rseth-sb-block-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Ethereum Mainnet Block",
          type: "trigger",
          config: {
            triggerType: "Block",
            network: "1",
            blockInterval: "1",
          },
          status: "idle",
          description: "Fires every Ethereum mainnet block (~12s)",
        },
      },
      {
        id: "rseth-sb-monitor-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 320,
        height: 320,
        position: { x: -360, y: 40 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "April 2026: a forged LayerZero message released ~116,500 rsETH from the Ethereum OFT adapter with no matching burn on the source chain. Circulating rsETH jumped while LRT vault collateral did not — the same supply-vs-backing invariant this workflow tracks. Substreams SQL sinks write backing_snapshots to Supabase; every mainnet block this workflow reads the latest row. True: Telegram unbacked-mint alert. False: Telegram backing-OK heartbeat so the run always completes. 1) Supabase in Project Integrations. 2) Bind Supabase on Get latest row. 3) Set Telegram chat ID on both Telegram nodes. 4) Deploy.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "rseth-sb-monitor-image",
        type: "image",
        dragHandle: ".canvas-image-drag-handle",
        width: 320,
        height: 240,
        position: { x: -360, y: 380 },
        data: {
          label: "Image",
          type: "image",
          config: {
            src: "/Black and White Minimalist  Digital Marketing Portfolio Presentation.png",
            alt: "Kelp rsETH backing monitor",
          },
          status: "idle",
        },
      },
      {
        id: "rseth-sb-query",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "Get latest row",
          type: "action",
          config: {
            actionType: "supabase/get-latest-row",
            table: "backing_snapshots",
            orderBy: "block_number",
            orderDirection: "desc",
            select:
              "block_number,timestamp,mainnet_supply,arb_supply,total_supply,steth_deposits,ethx_deposits,native_eth_deposits,adapter_balance,total_backing,excess,deviation_bps,bridge_deviation_bps,bridge_excess,should_alert,threshold_bps,effective_supply",
          },
          status: "idle",
          description:
            "Latest backing_snapshots row from Supabase (indexed by Substreams SQL sinks)",
        },
      },
      {
        id: "rseth-sb-deviation-condition",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "Deviation Above Threshold?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@rseth-sb-query:Get latest row.should_alert}} === true",
          },
          status: "idle",
          description:
            "Routes to an unbacked-mint Telegram alert when should_alert is true. False still finishes with a backing-OK Telegram report.",
        },
      },
      {
        id: "rseth-sb-telegram-alert",
        type: "action",
        position: { x: 840, y: 80 },
        data: {
          label: "Send Telegram Alert",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "KELP rsETH UNBACKED MINT DETECTED\n\nBlock: {{@rseth-sb-query:Get latest row.block_number}}\nTimestamp: {{@rseth-sb-query:Get latest row.timestamp}}\nTotal supply: {{@rseth-sb-query:Get latest row.total_supply}}\nTotal backing: {{@rseth-sb-query:Get latest row.total_backing}}\nExcess: {{@rseth-sb-query:Get latest row.excess}}\nDeviation bps: {{@rseth-sb-query:Get latest row.deviation_bps}}\nBridge deviation bps: {{@rseth-sb-query:Get latest row.bridge_deviation_bps}}\nEffective supply: {{@rseth-sb-query:Get latest row.effective_supply}}\nAction: pause rsETH as collateral until backing is restored.",
            parseMode: "none",
          },
          status: "idle",
          description:
            "Connect Telegram integration and set chat ID (numeric or @channel)",
        },
      },
      {
        id: "rseth-sb-telegram-ok",
        type: "action",
        position: { x: 840, y: 320 },
        data: {
          label: "Send backing OK",
          type: "action",
          config: {
            actionType: "telegram/send-message",
            chatId: "YOUR_TELEGRAM_CHAT_ID",
            message:
              "Kelp rsETH backing within threshold\n\nBlock: {{@rseth-sb-query:Get latest row.block_number}}\nTimestamp: {{@rseth-sb-query:Get latest row.timestamp}}\nDeviation: {{@rseth-sb-query:Get latest row.deviation_bps}} bps (limit {{@rseth-sb-query:Get latest row.threshold_bps}} bps)\nBridge deviation: {{@rseth-sb-query:Get latest row.bridge_deviation_bps}} bps\nTotal supply: {{@rseth-sb-query:Get latest row.total_supply}}\nTotal backing: {{@rseth-sb-query:Get latest row.total_backing}}\nNo unbacked mint this block. Monitor run completed.",
            parseMode: "none",
          },
          status: "idle",
          description: "Heartbeat when should_alert is false",
        },
      },
    ],
    edges: [
      {
        id: "e-rseth-sb-1",
        source: "rseth-sb-block-trigger",
        target: "rseth-sb-query",
      },
      {
        id: "e-rseth-sb-2",
        source: "rseth-sb-query",
        target: "rseth-sb-deviation-condition",
      },
      {
        id: "e-rseth-sb-3",
        source: "rseth-sb-deviation-condition",
        target: "rseth-sb-telegram-alert",
        sourceHandle: "true",
      },
      {
        id: "e-rseth-sb-4",
        source: "rseth-sb-deviation-condition",
        target: "rseth-sb-telegram-ok",
        sourceHandle: "false",
      },
    ],
  },
  {
    name: "Kelp rsETH Backing Monitor (RPC backup)",
    description:
      "RPC backup of the original Kelp monitor: every Ethereum block, read rsETH supply (mainnet + Arbitrum OFT) and LRTDepositPool backing (stETH, ETHx, native ETH), calculate deviation, and webhook-alert when supply exceeds backing by more than 50 bps. Does not use Substreams.",
    nodes: [
      {
        id: "rpc-rseth-block-trigger",
        type: "trigger",
        position: { x: 0, y: 200 },
        data: {
          label: "Ethereum Mainnet Block",
          type: "trigger",
          config: {
            triggerType: "Block",
            network: "1",
            blockInterval: "1",
          },
          status: "idle",
          description: "Fires every Ethereum mainnet block (~12s)",
        },
      },
      {
        id: "rpc-rseth-monitor-note",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 280,
        height: 200,
        position: { x: -320, y: 120 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "RPC backup (no Substreams). Replace webhook URL. rsETH mainnet 0xA1290d69…5A7, Arbitrum OFT 0x4186BF…41F, LRTDepositPool 0x036676…375d.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "rseth-mainnet-supply",
        type: "action",
        position: { x: 280, y: 200 },
        data: {
          label: "rsETH Mainnet Supply",
          type: "action",
          config: {
            actionType: "web3/read-contract",
            network: "1",
            contractAddress: "0xA1290d69c65A6Fe4DF752f95823fae25cB99e5A7",
            abi: '[{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]',
            abiFunction: "totalSupply",
          },
          status: "idle",
        },
      },
      {
        id: "rseth-arbitrum-supply",
        type: "action",
        position: { x: 560, y: 200 },
        data: {
          label: "rsETH Arbitrum Supply",
          type: "action",
          config: {
            actionType: "web3/read-contract",
            network: "42161",
            contractAddress: "0x4186BFC76E2E237523CBC30FD220FE055156b41F",
            abi: '[{"name":"totalSupply","type":"function","inputs":[],"outputs":[{"name":"","type":"uint256"}],"stateMutability":"view"}]',
            abiFunction: "totalSupply",
          },
          status: "idle",
          description: "rsETH OFT totalSupply on Arbitrum",
        },
      },
      {
        id: "rseth-steth-deposits",
        type: "action",
        position: { x: 840, y: 200 },
        data: {
          label: "stETH Deposits",
          type: "action",
          config: {
            actionType: "web3/read-contract",
            network: "1",
            contractAddress: "0x036676389e48133B63a802f8635AD39E752D375D",
            abi: '[{"name":"getTotalAssetDeposits","type":"function","inputs":[{"name":"asset","type":"address"}],"outputs":[{"name":"totalAssetDeposit","type":"uint256"}],"stateMutability":"view"}]',
            abiFunction: "getTotalAssetDeposits",
            functionArgs: '["0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"]',
          },
          status: "idle",
        },
      },
      {
        id: "rseth-ethx-deposits",
        type: "action",
        position: { x: 1120, y: 200 },
        data: {
          label: "ETHx Deposits",
          type: "action",
          config: {
            actionType: "web3/read-contract",
            network: "1",
            contractAddress: "0x036676389e48133B63a802f8635AD39E752D375D",
            abi: '[{"name":"getTotalAssetDeposits","type":"function","inputs":[{"name":"asset","type":"address"}],"outputs":[{"name":"totalAssetDeposit","type":"uint256"}],"stateMutability":"view"}]',
            abiFunction: "getTotalAssetDeposits",
            functionArgs: '["0xA35b1B31Ce002FBF2058D22F30f95D405200A15b"]',
          },
          status: "idle",
        },
      },
      {
        id: "rseth-native-eth-deposits",
        type: "action",
        position: { x: 1400, y: 200 },
        data: {
          label: "Native ETH Deposits",
          type: "action",
          config: {
            actionType: "web3/read-contract",
            network: "1",
            contractAddress: "0x036676389e48133B63a802f8635AD39E752D375D",
            abi: '[{"name":"getTotalAssetDeposits","type":"function","inputs":[{"name":"asset","type":"address"}],"outputs":[{"name":"totalAssetDeposit","type":"uint256"}],"stateMutability":"view"}]',
            abiFunction: "getTotalAssetDeposits",
            functionArgs: '["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"]',
          },
          status: "idle",
        },
      },
      {
        id: "calc-deviation",
        type: "action",
        position: { x: 1680, y: 200 },
        data: {
          label: "Calculate Deviation",
          type: "action",
          config: {
            actionType: "code/run-code",
            code: `// rsETH Backing Monitor: deviation calculator
const mainnetSupplyWei = BigInt(String({{@rseth-mainnet-supply:rsETH Mainnet Supply.result}} || 0));
const arbSupplyWei = BigInt(String({{@rseth-arbitrum-supply:rsETH Arbitrum Supply.result}} || 0));
const stethWei = BigInt(String({{@rseth-steth-deposits:stETH Deposits.result.totalAssetDeposit}} || 0));
const ethxWei = BigInt(String({{@rseth-ethx-deposits:ETHx Deposits.result.totalAssetDeposit}} || 0));
const nativeEthWei = BigInt(String({{@rseth-native-eth-deposits:Native ETH Deposits.result.totalAssetDeposit}} || 0));

// ETHx ~= 1.066 ETH (Stader non-rebasing LST)
const ethxInEthWei = (ethxWei * 1066n) / 1000n;
const totalSupplyWei = mainnetSupplyWei + arbSupplyWei;
const totalBackingWei = stethWei + ethxInEthWei + nativeEthWei;
const excessWei = totalSupplyWei > totalBackingWei ? totalSupplyWei - totalBackingWei : 0n;
const THRESHOLD_BPS = 50;
const deviationBps = totalBackingWei > 0n ? Number((excessWei * 10000n) / totalBackingWei) : 0;

return {
  mainnetSupplyEth: (Number(mainnetSupplyWei) / 1e18).toFixed(2),
  arbSupplyEth: (Number(arbSupplyWei) / 1e18).toFixed(2),
  totalSupplyEth: (Number(totalSupplyWei) / 1e18).toFixed(2),
  totalBackingEth: (Number(totalBackingWei) / 1e18).toFixed(2),
  excessEth: (Number(excessWei) / 1e18).toFixed(2),
  deviationBps: deviationBps,
  deviationPct: (deviationBps / 100).toFixed(3),
  isAlarming: deviationBps > THRESHOLD_BPS,
  thresholdBps: THRESHOLD_BPS,
};`,
          },
          status: "idle",
          description:
            "Aggregates rsETH circulation vs backing; isAlarming when deviation > 50 bps",
        },
      },
      {
        id: "rpc-rseth-deviation-condition",
        type: "action",
        position: { x: 1960, y: 200 },
        data: {
          label: "Deviation Above Threshold?",
          type: "action",
          config: {
            actionType: "Condition",
            condition:
              "{{@calc-deviation:Calculate Deviation.result.isAlarming}} === true",
          },
          status: "idle",
          description:
            "Routes to alert if rsETH supply exceeds backing by > 50 bps",
        },
      },
      {
        id: "rpc-rseth-webhook-alert",
        type: "action",
        position: { x: 2240, y: 200 },
        data: {
          label: "Send Webhook Alert",
          type: "action",
          config: {
            actionType: "webhook/send-webhook",
            webhookUrl: "https://YOUR_PAGERDUTY_OR_SLACK_WEBHOOK_URL",
            webhookMethod: "POST",
            webhookHeaders: '{"Content-Type": "application/json"}',
            webhookPayload:
              '{"alert":"KELP rsETH BACKING DEVIATION","blockNumber":"{{@rpc-rseth-block-trigger:Ethereum Mainnet Block.blockNumber}}","mainnetSupplyEth":"{{@calc-deviation:Calculate Deviation.result.mainnetSupplyEth}}","arbSupplyEth":"{{@calc-deviation:Calculate Deviation.result.arbSupplyEth}}","totalSupplyEth":"{{@calc-deviation:Calculate Deviation.result.totalSupplyEth}}","totalBackingEth":"{{@calc-deviation:Calculate Deviation.result.totalBackingEth}}","excessEth":"{{@calc-deviation:Calculate Deviation.result.excessEth}}","deviationBps":{{@calc-deviation:Calculate Deviation.result.deviationBps}},"deviationPct":"{{@calc-deviation:Calculate Deviation.result.deviationPct}}","thresholdBps":{{@calc-deviation:Calculate Deviation.result.thresholdBps}}}',
          },
          status: "idle",
          description:
            "Replace placeholder URL with PagerDuty, Opsgenie, or Slack incoming webhook",
        },
      },
    ],
    edges: [
      {
        id: "e-rseth-rpc-1",
        source: "rpc-rseth-block-trigger",
        target: "rseth-mainnet-supply",
      },
      {
        id: "e-rseth-rpc-2",
        source: "rseth-mainnet-supply",
        target: "rseth-arbitrum-supply",
      },
      {
        id: "e-rseth-rpc-3",
        source: "rseth-arbitrum-supply",
        target: "rseth-steth-deposits",
      },
      {
        id: "e-rseth-rpc-4",
        source: "rseth-steth-deposits",
        target: "rseth-ethx-deposits",
      },
      {
        id: "e-rseth-rpc-5",
        source: "rseth-ethx-deposits",
        target: "rseth-native-eth-deposits",
      },
      {
        id: "e-rseth-rpc-6",
        source: "rseth-native-eth-deposits",
        target: "calc-deviation",
      },
      {
        id: "e-rseth-rpc-7",
        source: "calc-deviation",
        target: "rpc-rseth-deviation-condition",
      },
      {
        id: "e-rseth-rpc-8",
        source: "rpc-rseth-deviation-condition",
        target: "rpc-rseth-webhook-alert",
        sourceHandle: "true",
      },
    ],
  },
];
