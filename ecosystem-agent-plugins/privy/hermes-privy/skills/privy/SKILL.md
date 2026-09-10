---
name: privy
description: Use Privy wallet and treasury tools for embedded wallets, server wallets, signing, transfers, and Graphitti workflows. Use when the user asks about wallets, signing, treasury payments, or Graphitti Privy workflows.
---

# Privy wallet and treasury tools

Use these tools when the user asks about embedded wallets, server wallets, signing, transfers, treasury payments, or Graphitti Privy workflows.

## Native Privy vs Graphitti tools

| Goal | Tool |
|---|---|
| Read a specific wallet by ID | `privy_get_wallet` |
| Read the org treasury wallet and recent intents | `privy_get_treasury` |
| Transfer from an individual wallet directly | `privy_wallet_transfer` |
| Execute a listed payroll or treasury workflow | `privy_call_workflow` |
| Sign a message with a wallet | `privy_sign_message` |
| Create a payment intent for quorum approval | `privy_create_treasury_intent` |
| Approve a pending treasury intent | `privy_approve_treasury_intent` |

## Wallet operations sequence

1. Find wallets with `privy_list_wallets` or `privy_get_wallet_by_address`.
2. Check balance with `privy_get_balance`.
3. For signing or sending, provide `wallet_id` and `network`.
4. For quorum-gated transfers, create an intent with `privy_create_transfer_intent` and then approve with `privy_approve_treasury_intent`.

## Additional resources

- For credential setup, see [references/credentials.md](references/credentials.md)
- For treasury and workflow tools, see [references/workflows.md](references/workflows.md)
