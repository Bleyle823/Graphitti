<p align="center">
  <img src="../docs/images/brand/graphitti-workflows-cover.png" alt="Graphitti Workflows" width="720" />
</p>

# Graphitti app

Next.js workflow builder and execution layer for **Privy** treasuries, **The Graph** data, **Arc / Circle** USDC flows, and the **Gateway x402** marketplace.

| | |
| --- | --- |
| Production | [graphitti-five.vercel.app](https://graphitti-five.vercel.app) |
| Product overview and onchain evidence | [Repository README](../README.md) |
| Run starred examples (env vars, Telegram chat id, Stripe `cus_`, placeholders) | [Featured workflows](../docs/workflows/featured-workflows.mdx) |
| Agent MCP packages | [`@graphitti/graph-core`](../ecosystem-agent-plugins/the-graph/graph-core), [`@graphitti/privy-core`](../ecosystem-agent-plugins/privy/privy-core) |

Payroll and org treasury settle on **Base Sepolia USDC**. Marketplace and FPL payouts use **Arc Testnet** (`eip155:5042002`). Featured Uniswap demos use **subgraph reads only**, not on-chain router swaps.

## Run locally

```bash
cp .env.example .env.local   # fill sponsor keys below + auth/database minimums
pnpm install
pnpm setup
pnpm dev
```

Minimum auth/database variables are in `.env.example`. For starred workflows, configure **Project Integrations** in the app (Stripe, Telegram, Supabase, Circle) and the server env keys in the table below.

## Sponsor plugins in this app

Canvas plugins and primary code paths used in shipped examples:

### Privy

Execution layer: embedded wallet, org treasury, policies, payee allowlist, wallet-actions, transfer intents, sponsored transactions.

| Example workflows | Plugin actions |
| --- | --- |
| Payroll batch with intent fallback, Stripe invoice to Privy USDC settlement, Privy Gasless Payroll, Org USDC waterline keeper, Aave Uniswap USDC keeper | `privy/wallet-transfer`, `privy/create-transfer-intent`, `privy/get-intent`, `privy/transfer`, `treasury/get-org-wallet`, `treasury/list-payees` |

| Env / setup | Source |
| --- | --- |
| `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_AUTHORIZATION_KEY` | [Privy Dashboard](https://dashboard.privy.io) |
| Org treasury | App **Treasury** (create org, fund, payees, approve intents) |

Code: [`plugins/privy/`](plugins/privy), [`lib/privy/provision-org-treasury.ts`](lib/privy/provision-org-treasury.ts), [`lib/privy/policy-rules.ts`](lib/privy/policy-rules.ts)

### The Graph

Gateway GraphQL subgraph queries, Substreams registry, Kelp monitor via Supabase SQL sink (see [`../substreams/`](../substreams/)).

| Example workflows | Plugin actions |
| --- | --- |
| Uniswap V3 large swap alert (subgraph), Aave Uniswap USDC keeper, Kelp rsETH Backing Monitor | `the-graph/query-subgraph`, `supabase/get-latest-row` |

| Env / setup | Source |
| --- | --- |
| `THEGRAPH_API_KEY` | [Subgraph Studio](https://thegraph.com/studio/) |
| Supabase URL + anon key | Project Integrations; Kelp table `backing_snapshots` |

Code: [`plugins/the-graph/`](plugins/the-graph/), [`lib/the-graph/kelp-substreams-deployments.ts`](lib/the-graph/kelp-substreams-deployments.ts)

### Arc and Circle

Arc Testnet USDC (native 18-decimal and ERC-20 6-decimal), CCTP, App Kit genesis helpers, StableFX, Gateway **x402** marketplace settlement (`GatewayWalletBatched`).

| Example workflows | Plugin actions |
| --- | --- |
| Arc DeFi treasury readiness, FPL League Top Two USDC Payouts, marketplace pay | `arc/send-on-arc`, `arc/estimate-bridge`, `arc/get-usdc-erc20-balance`, `circle/get-domains`, `circle/get-usdc-balance`, `circle/pay-x402`, `circle/settle-x402` |

| Env / setup | Source |
| --- | --- |
| `CIRCLE_API_KEY`, optional `CIRCLE_ENTITY_SECRET` | [Circle Developer Console](https://developers.circle.com/) |
| `PRIVATE_KEY` | Arc Testnet USDC buyer for marketplace / Gateway deposit (see `.env.example`) |
| Gateway verifier (Arc Testnet) | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |

Code: [`lib/arc/app-kit-flows.ts`](lib/arc/app-kit-flows.ts), [`lib/marketplace/x402.ts`](lib/marketplace/x402.ts), [`plugins/arc/`](plugins/arc/), [`plugins/circle/`](plugins/circle/)

### Supporting integrations (examples)

| Integration | Used for | Config |
| --- | --- | --- |
| Stripe | Stripe invoice to Privy USDC settlement | Project Integrations `sk_test_...`; invoice node `customerId` (`cus_...`) from [Stripe Customers](https://dashboard.stripe.com/customers) |
| Telegram | Alerts on most starred graphs | `TELEGRAM_BOT_TOKEN` + **chat id** on each node ([BotFather](https://t.me/BotFather), `getUpdates`) |
| Supabase | Kelp backing rows | Anon key + `backing_snapshots` ([plugin doc](../docs/plugins/supabase.mdx)) |
| Fantasy Premier League | FPL Arc payouts | Public reads; set **league id** and roster JSON on template nodes |

## Starred workflow gallery

These templates are pinned first in the app gallery:

1. Uniswap V3 large swap alert (subgraph) — The Graph  
2. Kelp rsETH Backing Monitor (Substreams → Supabase) — The Graph + Supabase  
3. Arc DeFi treasury readiness — Arc + Circle  
4. FPL League Top Two USDC Payouts — Arc + FPL  
5. Payroll batch with intent fallback — Privy  
6. Stripe invoice to Privy USDC settlement — Privy + Stripe  
7. Privy Gasless Payroll — Privy  
8. Aave Uniswap USDC keeper — The Graph + Privy  
9. Org USDC waterline keeper — Privy + Circle  

If Telegram or notification nodes still show `YOUR_TELEGRAM_CHAT_ID`, upstream Graph / Privy / Arc steps can still succeed; see the [featured workflows guide](../docs/workflows/featured-workflows.mdx) for placeholder behavior.

## Scripts

```bash
pnpm dev
pnpm build
pnpm type-check
pnpm fix
```

## License

Apache 2.0
