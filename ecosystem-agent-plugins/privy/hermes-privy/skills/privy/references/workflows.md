# Privy treasury and workflow tools

## Treasury operations sequence

1. Read treasury state with `privy_get_treasury` (includes wallet address, payees, recent intents).
2. List payees with `privy_list_payees`.
3. Create a payment intent with `privy_create_treasury_intent` (requires `amount_usdc` and `to_address`).
4. Approve the intent with `privy_approve_treasury_intent`.
5. Poll intent status with `privy_get_treasury_intent`.

## Graphitti workflow tools

When `GRAPHITTI_API_KEY` is set:

| Tool | Purpose |
|---|---|
| `privy_search_workflows` | Search listed workflows with category `privy` |
| `privy_get_listing` | Read a marketplace listing by slug |
| `privy_call_workflow` | Execute a listed treasury or payroll flow |
| `privy_execute_workflow` | Execute an owned workflow by id |
| `privy_get_execution` | Poll execution status |
| `privy_whoami` | Verify API key and scopes |

`privy_call_workflow` executes a listed Graphitti marketplace workflow by slug. Use when operating through published automation rather than the raw Privy wallet API.
