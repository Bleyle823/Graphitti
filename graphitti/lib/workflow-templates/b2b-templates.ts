import type { WorkflowTemplate } from "./normalize-export";

const PLACEHOLDER = "0x0000000000000000000000000000000000000001";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

function trigger(
  id: string,
  label: string,
  config: Record<string, string>,
  y = 200
) {
  return {
    id,
    type: "trigger" as const,
    position: { x: 0, y },
    data: {
      label,
      type: "trigger" as const,
      config,
      status: "idle" as const,
    },
  };
}

function action(
  id: string,
  position: { x: number; y: number },
  label: string,
  config: Record<string, string>
) {
  return {
    id,
    type: "action" as const,
    position,
    data: {
      label,
      type: "action" as const,
      config,
      status: "idle" as const,
    },
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string
) {
  return sourceHandle
    ? { id, source, target, sourceHandle }
    : { id, source, target };
}

export const B2B_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Stripe invoice then org payout",
    description:
      "Create a Stripe invoice, resolve the org Privy treasury, pay an allowlisted vendor, and notify Slack.",
    nodes: [
      trigger("trigger-stripe-payout", "Invoice paid", {
        triggerType: "Manual",
      }),
      action("stripe-customer", { x: 260, y: 200 }, "Create Stripe customer", {
        actionType: "stripe/create-customer",
        email: "ap@example.com",
        name: "Vendor Co",
      }),
      action("stripe-invoice", { x: 520, y: 200 }, "Create Stripe invoice", {
        actionType: "stripe/create-invoice",
        customerId: "{{@stripe-customer:Create Stripe customer.id}}",
        description: "Vendor invoice",
        lineItems:
          '[{"description": "Services", "amount": 25000, "quantity": 1}]',
      }),
      action("get-wallet-stripe", { x: 780, y: 120 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("list-payees-stripe", { x: 780, y: 280 }, "List payees", {
        actionType: "treasury/list-payees",
      }),
      action("privy-wallet-stripe", { x: 1040, y: 120 }, "Get Privy wallet", {
        actionType: "privy/get-wallet",
        walletId: "{{@get-wallet-stripe:Get org wallet.walletId}}",
      }),
      action("pay-vendor-stripe", { x: 1040, y: 280 }, "Pay vendor", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-stripe:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "25",
        destinationAddress: PLACEHOLDER,
        useIntent: "false",
      }),
      action("notify-stripe", { x: 1300, y: 200 }, "Notify AP", {
        actionType: "slack/send-message",
        slackChannel: "#ap",
        slackMessage:
          "Invoice {{@stripe-invoice:Create Stripe invoice.number}} paid onchain\nStatus: {{@pay-vendor-stripe:Pay vendor.status}}",
      }),
    ],
    edges: [
      edge("es1", "trigger-stripe-payout", "stripe-customer"),
      edge("es2", "stripe-customer", "stripe-invoice"),
      edge("es3", "stripe-invoice", "get-wallet-stripe"),
      edge("es4", "stripe-invoice", "list-payees-stripe"),
      edge("es5", "get-wallet-stripe", "privy-wallet-stripe"),
      edge("es6", "get-wallet-stripe", "pay-vendor-stripe"),
      edge("es7", "list-payees-stripe", "pay-vendor-stripe"),
      edge("es8", "pay-vendor-stripe", "notify-stripe"),
    ],
  },
  {
    name: "Cap-aware scheduled payroll",
    description:
      "Run payroll on a schedule. Auto-pay under the org spend cap; escalate over-cap amounts as a Privy transfer intent.",
    nodes: [
      trigger("trigger-cap-payroll", "Every weekday 9am", {
        triggerType: "Schedule",
        scheduleCron: "0 9 * * 1-5",
        scheduleTimezone: "UTC",
      }),
      action("get-wallet-cap", { x: 280, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("under-cap", { x: 560, y: 120 }, "Under auto cap?", {
        actionType: "Condition",
        condition:
          'Number("25") <= Number("{{@get-wallet-cap:Get org wallet.autoSpendCapUsdc}}")',
      }),
      action("auto-pay", { x: 840, y: 80 }, "Auto payroll transfer", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-cap:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "25",
        destinationAddress: PLACEHOLDER,
        useIntent: "false",
      }),
      action("intent-pay", { x: 840, y: 280 }, "Create payroll intent", {
        actionType: "privy/create-transfer-intent",
        walletId: "{{@get-wallet-cap:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "250",
        destinationAddress: PLACEHOLDER,
      }),
      action("notify-cap", { x: 1120, y: 200 }, "Notify payroll", {
        actionType: "slack/send-message",
        slackChannel: "#payroll",
        slackMessage:
          "Payroll run\nAuto: {{@auto-pay:Auto payroll transfer.status}}\nIntent: {{@intent-pay:Create payroll intent.intent_id}}",
      }),
    ],
    edges: [
      edge("ec1", "trigger-cap-payroll", "get-wallet-cap"),
      edge("ec2", "get-wallet-cap", "under-cap"),
      edge("ec3", "under-cap", "auto-pay", "true"),
      edge("ec4", "under-cap", "intent-pay", "false"),
      edge("ec5", "auto-pay", "notify-cap"),
      edge("ec6", "intent-pay", "notify-cap"),
    ],
  },
  {
    name: "Inbound whale sweep",
    description:
      "Watch large USDC transfers, then sweep into the org Privy treasury and alert Discord.",
    nodes: [
      trigger("trigger-whale", "Every 15 minutes", {
        triggerType: "Schedule",
        scheduleCron: "*/15 * * * *",
        scheduleTimezone: "UTC",
      }),
      action("graph-transfers", { x: 280, y: 200 }, "Get recent transfers", {
        actionType: "the-graph/get-token-transfers",
        network: "mainnet",
        address: PLACEHOLDER,
        age: "1",
      }),
      action("whale-condition", { x: 560, y: 200 }, "Large inbound?", {
        actionType: "Condition",
        condition: '{{@graph-transfers:Get recent transfers.result}} !== ""',
      }),
      action("get-wallet-whale", { x: 840, y: 120 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("privy-wallet-whale", { x: 840, y: 280 }, "Get Privy wallet", {
        actionType: "privy/get-wallet",
        walletId: "{{@get-wallet-whale:Get org wallet.walletId}}",
      }),
      action("sweep-whale", { x: 1120, y: 200 }, "Sweep to treasury", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-whale:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "10",
        destinationAddress: "{{@get-wallet-whale:Get org wallet.address}}",
        useIntent: "false",
      }),
      action("notify-whale", { x: 1400, y: 200 }, "Alert finance", {
        actionType: "discord/send-message",
        discordMessage:
          "Inbound sweep submitted\nStatus: {{@sweep-whale:Sweep to treasury.status}}",
      }),
    ],
    edges: [
      edge("ew1", "trigger-whale", "graph-transfers"),
      edge("ew2", "graph-transfers", "whale-condition"),
      edge("ew3", "whale-condition", "get-wallet-whale", "true"),
      edge("ew4", "get-wallet-whale", "privy-wallet-whale"),
      edge("ew5", "get-wallet-whale", "sweep-whale"),
      edge("ew6", "sweep-whale", "notify-whale"),
    ],
  },
  {
    name: "Vendor bill with Linear ticket",
    description:
      "Queue a vendor bill as a Privy transfer intent and open a Linear AP ticket for audit.",
    nodes: [
      trigger("trigger-vendor-linear", "Submit vendor bill", {
        triggerType: "Manual",
      }),
      action("get-wallet-linear", { x: 280, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("list-payees-linear", { x: 560, y: 200 }, "List payees", {
        actionType: "treasury/list-payees",
      }),
      action(
        "create-intent-linear",
        { x: 840, y: 120 },
        "Create transfer intent",
        {
          actionType: "privy/create-transfer-intent",
          walletId: "{{@get-wallet-linear:Get org wallet.walletId}}",
          sourceChain: "base_sepolia",
          sourceAsset: "usdc",
          amount: "250",
          destinationAddress: PLACEHOLDER,
        }
      ),
      action("get-intent-linear", { x: 840, y: 280 }, "Get intent status", {
        actionType: "privy/get-intent",
        intentId: "{{@create-intent-linear:Create transfer intent.intent_id}}",
      }),
      action("ticket-linear", { x: 1120, y: 200 }, "Open AP ticket", {
        actionType: "linear/create-ticket",
        ticketTitle: "Vendor bill pending quorum",
        ticketDescription:
          "Intent {{@create-intent-linear:Create transfer intent.intent_id}} status {{@get-intent-linear:Get intent status.status}}",
        ticketPriority: "2",
      }),
    ],
    edges: [
      edge("el1", "trigger-vendor-linear", "get-wallet-linear"),
      edge("el2", "get-wallet-linear", "list-payees-linear"),
      edge("el3", "list-payees-linear", "create-intent-linear"),
      edge("el4", "create-intent-linear", "get-intent-linear"),
      edge("el5", "get-intent-linear", "ticket-linear"),
    ],
  },
  {
    name: "Cross-chain settle then pay vendor",
    description:
      "Bridge USDC with Circle CCTP into the org treasury, then pay a vendor from the Privy wallet.",
    nodes: [
      trigger("trigger-cctp", "Settle inbound USDC", {
        triggerType: "Manual",
      }),
      action("get-wallet-cctp", { x: 280, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("cctp-burn", { x: 560, y: 80 }, "Deposit for burn", {
        actionType: "circle/deposit-for-burn",
        network: "base-sepolia",
        destinationNetwork: "arc-testnet",
        amount: "25",
        mintRecipient: "{{@get-wallet-cctp:Get org wallet.address}}",
        tokenSymbol: "USDC",
      }),
      action("cctp-attest", { x: 560, y: 200 }, "Get IRIS attestation", {
        actionType: "circle/get-iris-attestation",
        sourceHash: "{{@cctp-burn:Deposit for burn.hash}}",
      }),
      action("cctp-mint", { x: 560, y: 320 }, "Receive mint", {
        actionType: "circle/receive-mint",
        network: "arc-testnet",
        attestation: "{{@cctp-attest:Get IRIS attestation.attestation}}",
      }),
      action("privy-wallet-cctp", { x: 840, y: 120 }, "Get Privy wallet", {
        actionType: "privy/get-wallet",
        walletId: "{{@get-wallet-cctp:Get org wallet.walletId}}",
      }),
      action("pay-cctp", { x: 840, y: 280 }, "Pay vendor", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-cctp:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "25",
        destinationAddress: PLACEHOLDER,
        useIntent: "false",
      }),
      action("notify-cctp", { x: 1120, y: 200 }, "Notify treasury", {
        actionType: "discord/send-message",
        discordMessage:
          "CCTP settle then payout\nTx: {{@pay-cctp:Pay vendor.transaction_hash}}",
      }),
    ],
    edges: [
      edge("ex1", "trigger-cctp", "get-wallet-cctp"),
      edge("ex2", "get-wallet-cctp", "cctp-burn"),
      edge("ex3", "cctp-burn", "cctp-attest"),
      edge("ex4", "cctp-attest", "cctp-mint"),
      edge("ex5", "get-wallet-cctp", "privy-wallet-cctp"),
      edge("ex6", "cctp-mint", "pay-cctp"),
      edge("ex7", "pay-cctp", "notify-cctp"),
    ],
  },
  {
    name: "Idle USDC quote then rebalance",
    description:
      "Check org USDC, compare a CoW quote, then rebalance with a Privy wallet swap.",
    nodes: [
      trigger("trigger-rebalance", "Every 6 hours", {
        triggerType: "Schedule",
        scheduleCron: "0 */6 * * *",
        scheduleTimezone: "UTC",
      }),
      action("get-wallet-rebalance", { x: 280, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("check-usdc", { x: 560, y: 200 }, "Check USDC balance", {
        actionType: "web3/check-token-balance",
        network: "base-sepolia",
        address: "{{@get-wallet-rebalance:Get org wallet.address}}",
        tokenConfig: "USDC",
      }),
      action("idle-condition", { x: 840, y: 200 }, "Idle cash?", {
        actionType: "Condition",
        condition: '{{@check-usdc:Check USDC balance.balance.balance}} !== "0"',
      }),
      action("privy-wallet-rebalance", { x: 1120, y: 40 }, "Get Privy wallet", {
        actionType: "privy/get-wallet",
        walletId: "{{@get-wallet-rebalance:Get org wallet.walletId}}",
      }),
      action("cow-quote", { x: 1120, y: 120 }, "Get CoW quote", {
        actionType: "cowswap/get-quote",
        network: "base",
        sellToken: USDC_BASE_SEPOLIA,
        buyToken: "0x4200000000000000000000000000000000000006",
        from: "{{@get-wallet-rebalance:Get org wallet.address}}",
        kind: "sell",
        amount: "10000000",
      }),
      action("privy-swap", { x: 1120, y: 280 }, "Privy rebalance swap", {
        actionType: "privy/wallet-swap",
        walletId: "{{@get-wallet-rebalance:Get org wallet.walletId}}",
        chain: "base_sepolia",
        fromAsset: "usdc",
        toAsset: "eth",
        amount: "10",
      }),
      action("notify-rebalance", { x: 1400, y: 200 }, "Notify treasury", {
        actionType: "discord/send-message",
        discordMessage:
          "Rebalance swap {{@privy-swap:Privy rebalance swap.status}}\nCoW buyAmount {{@cow-quote:Get CoW quote.buyAmount}}",
      }),
    ],
    edges: [
      edge("er1", "trigger-rebalance", "get-wallet-rebalance"),
      edge("er2", "get-wallet-rebalance", "check-usdc"),
      edge("er3", "check-usdc", "idle-condition"),
      edge("er4", "idle-condition", "privy-wallet-rebalance", "true"),
      edge("er5", "idle-condition", "cow-quote", "true"),
      edge("er6", "idle-condition", "privy-swap", "true"),
      edge("er7", "privy-swap", "notify-rebalance"),
    ],
  },
  {
    name: "Safe pending cover from org",
    description:
      "Watch pending Safe transactions and cover them from the org Privy treasury after a transfer intent.",
    nodes: [
      trigger("trigger-safe", "Every 30 minutes", {
        triggerType: "Schedule",
        scheduleCron: "*/30 * * * *",
        scheduleTimezone: "UTC",
      }),
      action("safe-pending", { x: 280, y: 200 }, "Get pending Safe txs", {
        actionType: "safe/get-pending-transactions",
        safeAddress: PLACEHOLDER,
      }),
      action("safe-condition", { x: 560, y: 200 }, "Has pending txs?", {
        actionType: "Condition",
        condition: '{{@safe-pending:Get pending Safe txs.count}} !== "0"',
      }),
      action("get-wallet-safe", { x: 840, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("intent-safe", { x: 1120, y: 120 }, "Create cover intent", {
        actionType: "privy/create-transfer-intent",
        walletId: "{{@get-wallet-safe:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "100",
        destinationAddress: PLACEHOLDER,
      }),
      action("get-intent-safe", { x: 1120, y: 280 }, "Get intent status", {
        actionType: "privy/get-intent",
        intentId: "{{@intent-safe:Create cover intent.intent_id}}",
      }),
      action("notify-safe", { x: 1400, y: 200 }, "Notify ops", {
        actionType: "discord/send-message",
        discordMessage:
          "Safe cover intent {{@intent-safe:Create cover intent.intent_id}} status {{@get-intent-safe:Get intent status.status}}",
      }),
    ],
    edges: [
      edge("esa1", "trigger-safe", "safe-pending"),
      edge("esa2", "safe-pending", "safe-condition"),
      edge("esa3", "safe-condition", "get-wallet-safe", "true"),
      edge("esa4", "get-wallet-safe", "intent-safe"),
      edge("esa5", "intent-safe", "get-intent-safe"),
      edge("esa6", "get-intent-safe", "notify-safe"),
    ],
  },
  {
    name: "Payroll batch with intent fallback",
    description:
      "Pay allowlisted contractors under the auto cap, queue a large remainder as an intent, and file a Linear ticket.",
    nodes: [
      trigger("trigger-batch", "Monthly payroll", {
        triggerType: "Schedule",
        scheduleCron: "0 12 1 * *",
        scheduleTimezone: "UTC",
      }),
      action("get-wallet-batch", { x: 280, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action("list-payees-batch", { x: 560, y: 200 }, "List payees", {
        actionType: "treasury/list-payees",
      }),
      action("small-pay", { x: 840, y: 80 }, "Small contractor payout", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-batch:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "25",
        destinationAddress: PLACEHOLDER,
        useIntent: "false",
      }),
      action("large-intent", { x: 840, y: 280 }, "Large payroll intent", {
        actionType: "privy/create-transfer-intent",
        walletId: "{{@get-wallet-batch:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "500",
        destinationAddress: PLACEHOLDER,
      }),
      action("ticket-batch", { x: 1120, y: 200 }, "File payroll ticket", {
        actionType: "linear/create-ticket",
        ticketTitle: "Monthly payroll batch",
        ticketDescription:
          "Auto {{@small-pay:Small contractor payout.status}} intent {{@large-intent:Large payroll intent.intent_id}}",
        ticketPriority: "2",
      }),
    ],
    edges: [
      edge("eb1", "trigger-batch", "get-wallet-batch"),
      edge("eb2", "get-wallet-batch", "list-payees-batch"),
      edge("eb3", "list-payees-batch", "small-pay"),
      edge("eb4", "list-payees-batch", "large-intent"),
      edge("eb5", "small-pay", "ticket-batch"),
      edge("eb6", "large-intent", "ticket-batch"),
    ],
  },
  {
    name: "Stripe invoice to Privy USDC settlement",
    description:
      "Create a Stripe invoice for a client, map the payout to a contractor wallet, and settle in USDC from the org Privy treasury with a Telegram confirmation.",
    nodes: [
      trigger("trigger-stripe-settle", "Demo invoice run", {
        triggerType: "Manual",
      }),
      {
        id: "note-stripe-settle",
        type: "note",
        dragHandle: ".sticky-note-drag-handle",
        width: 280,
        height: 200,
        position: { x: -300, y: 160 },
        data: {
          label: "Sticky note",
          type: "note",
          config: {
            text: "Connect Stripe, Privy, and Telegram integration keys only. Customer, invoice line items, contractor address, and USDC amount are preset for the demo. Set Telegram chat ID on both Telegram nodes. Create an org treasury before running.",
            color: "blue",
            fontSize: "sm",
            textAlign: "left",
          },
          status: "idle",
        },
      },
      {
        id: "image-stripe-settle",
        type: "image",
        dragHandle: ".canvas-image-drag-handle",
        width: 240,
        height: 120,
        position: { x: -300, y: 380 },
        data: {
          label: "Image",
          type: "image",
          config: {
            src: "/protocols/Stripe wordmark - Blurple - Small.png",
            alt: "Stripe",
          },
          status: "idle",
        },
      },
      action(
        "stripe-settle-customer",
        { x: 260, y: 200 },
        "Create Stripe customer",
        {
          actionType: "stripe/create-customer",
          email: "bleyleosewe19@gmail.com",
          name: "Client Co",
        }
      ),
      action(
        "stripe-settle-invoice",
        { x: 520, y: 200 },
        "Create Stripe invoice",
        {
          actionType: "stripe/create-invoice",
          customerId: "{{@stripe-settle-customer:Create Stripe customer.id}}",
          email: "bleyleosewe19@gmail.com",
          name: "Client Co",
          description: "Agency services",
          lineItems:
            '[{"description": "Contractor deliverable", "amount": 25000, "quantity": 1}]',
          daysUntilDue: "30",
          autoAdvance: "true",
          collectionMethod: "send_invoice",
        }
      ),
      action("get-wallet-stripe-settle", { x: 780, y: 200 }, "Get org wallet", {
        actionType: "treasury/get-org-wallet",
      }),
      action(
        "privy-wallet-stripe-settle",
        { x: 1040, y: 200 },
        "Get Privy wallet",
        {
          actionType: "privy/get-wallet",
          walletId: "{{@get-wallet-stripe-settle:Get org wallet.walletId}}",
        }
      ),
      action(
        "payout-valid-stripe-settle",
        { x: 1300, y: 200 },
        "Payout valid?",
        {
          actionType: "Condition",
          condition:
            'String("{{@stripe-settle-invoice:Create Stripe invoice.id}}" || "").length > 0',
        }
      ),
      action("pay-stripe-settle", { x: 1560, y: 200 }, "Pay contractor USDC", {
        actionType: "privy/wallet-transfer",
        walletId: "{{@get-wallet-stripe-settle:Get org wallet.walletId}}",
        sourceChain: "base_sepolia",
        sourceAsset: "usdc",
        amount: "1",
        destinationAddress: "0xe53c55806328d94A345f2784c7387495505B1CF1",
        useIntent: "false",
      }),
      action(
        "telegram-stripe-settle",
        { x: 1820, y: 80 },
        "Send Telegram confirmation",
        {
          actionType: "telegram/send-message",
          chatId: "YOUR_TELEGRAM_CHAT_ID",
          message:
            "Stripe invoice {{@stripe-settle-invoice:Create Stripe invoice.number}} settled onchain\nInvoice ID: {{@stripe-settle-invoice:Create Stripe invoice.id}}\nPayout status: {{@pay-stripe-settle:Pay contractor USDC.status}}",
          parseMode: "none",
        }
      ),
      action(
        "telegram-stripe-held",
        { x: 1820, y: 320 },
        "Send payout held notice",
        {
          actionType: "telegram/send-message",
          chatId: "YOUR_TELEGRAM_CHAT_ID",
          message:
            "Stripe invoice payout held\n\nInvoice was not ready for onchain settlement (missing or invalid invoice id). No USDC transfer sent.\nCustomer: bleyleosewe19@gmail.com",
          parseMode: "none",
        }
      ),
    ],
    edges: [
      edge("ess1", "trigger-stripe-settle", "stripe-settle-customer"),
      edge("ess2", "stripe-settle-customer", "stripe-settle-invoice"),
      edge("ess3", "stripe-settle-invoice", "get-wallet-stripe-settle"),
      edge("ess4", "get-wallet-stripe-settle", "privy-wallet-stripe-settle"),
      edge("ess5", "privy-wallet-stripe-settle", "payout-valid-stripe-settle"),
      edge("ess6", "payout-valid-stripe-settle", "pay-stripe-settle", "true"),
      edge("ess7", "pay-stripe-settle", "telegram-stripe-settle"),
      edge(
        "ess8",
        "payout-valid-stripe-settle",
        "telegram-stripe-held",
        "false"
      ),
    ],
  },
];

export const B2B_WORKFLOW_TEMPLATE_NAMES = B2B_WORKFLOW_TEMPLATES.map(
  (template) => template.name
);
