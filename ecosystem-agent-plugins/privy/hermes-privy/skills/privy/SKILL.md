# Privy wallet and treasury tools

Use these tools when the user asks about embedded wallets, server wallets, signing, transfers, treasury payments, or Graphitti Privy workflows.

## Native Privy vs Graphitti tools

Privy exposes two distinct layers of tooling. Choose the right one for the task:

| Goal | Tool |
|---|---|
| Read a specific wallet by ID | `privy_get_wallet` |
| Read the org treasury wallet and recent intents | `privy_get_treasury` |
| Transfer from an individual wallet directly | `privy_wallet_transfer` |
| Execute a listed payroll or treasury workflow | `privy_call_workflow` |
| Sign a message with a wallet | `privy_sign_message` |
| Create a payment intent for quorum approval | `privy_create_treasury_intent` |
| Approve a pending treasury intent | `privy_approve_treasury_intent` |

`privy_get_wallet` reads a Privy server wallet via the native REST API (`api.privy.io`). It requires `PRIVY_APP_ID` and `PRIVY_APP_SECRET`.

`privy_get_treasury` reads the Graphitti org treasury — the shared Privy organization wallet with policies, payees, and pending intents. It requires `GRAPHITTI_API_KEY` with treasury scope.

`privy_wallet_transfer` sends USDC directly from a Privy wallet via `api.privy.io`. Use when you have a wallet ID and want a raw transfer without a Graphitti workflow.

`privy_call_workflow` executes a listed Graphitti marketplace workflow by slug (e.g. a payroll or multi-step treasury flow). Use when operating through published automation rather than the raw wallet API.

## Wallet operations sequence

1. Find wallets with `privy_list_wallets` or `privy_get_wallet_by_address`.
2. Check balance with `privy_get_balance`.
3. For signing or sending, provide `wallet_id` and `network`.
4. For quorum-gated transfers, create an intent with `privy_create_transfer_intent` and then approve with `privy_approve_treasury_intent`.

## Treasury operations sequence

1. Read treasury state with `privy_get_treasury` (includes wallet address, payees, recent intents).
2. List payees with `privy_list_payees`.
3. Create a payment intent with `privy_create_treasury_intent` (requires `amount_usdc` and `to_address`).
4. Approve the intent with `privy_approve_treasury_intent`.
5. Poll intent status with `privy_get_treasury_intent`.

## Graphitti workflows

When `GRAPHITTI_API_KEY` is set:

- `privy_search_workflows` with category `privy`
- `privy_call_workflow` for listed marketplace treasury flows
- `privy_execute_workflow` for owned workflow ids
- `privy_get_execution` to poll execution status

## Credentials

- `PRIVY_APP_ID` — Privy application ID from the Privy dashboard (required)
- `PRIVY_APP_SECRET` — Privy application secret (required)
- `PRIVY_AUTHORIZATION_KEY` — Privy authorization key for policy-gated operations (optional)
- `GRAPHITTI_API_KEY` — Graphitti B2B/marketplace key required for treasury and workflow tools (optional)
- `GRAPHITTI_BASE_URL` — Override for self-hosted Graphitti instances (optional)
