<p align="center">
  <video src="../docs/media/graphitti-workflow-demo.mp4" width="720" controls playsinline>
    Your browser does not support embedded video. <a href="../docs/media/graphitti-workflow-demo.mp4">Download the Graphitti workflow demo</a>.
  </video>
</p>

# Graphitti app

Next.js workflow builder and execution layer for **Privy** treasuries, **The Graph** data, **Arc / Circle** USDC flows, and the **Gateway x402** marketplace.

| | |
| --- | --- |
| Production | [graphitti-five.vercel.app](https://graphitti-five.vercel.app) |
| Product overview and onchain runs | [Repository README](../README.md) |
| Run starred examples (env vars, funding, Telegram chat id, Stripe `cus_`) | [Featured workflows](../docs/workflows/featured-workflows.mdx) · [Run and fund](../docs/workflows/running-and-funding.mdx) |
| Agent MCP packages | [`@graphitti/graph-core`](../ecosystem-agent-plugins/the-graph/graph-core), [`@graphitti/privy-core`](../ecosystem-agent-plugins/privy/privy-core) |

Payroll and org treasury settle on **Base Sepolia USDC**. Marketplace paid calls settle on **Arc** (`eip155:5042`) unless the listing chain is Arc Testnet. FPL payouts use **Arc Testnet** (`eip155:5042002`). Featured Uniswap demos use **subgraph reads only**, not on-chain router swaps.

## Run the project locally

All commands below are run from the **`graphitti/`** directory (this folder).

### Prerequisites

| Requirement | Notes |
| --- | --- |
| [Node.js](https://nodejs.org/) 18+ | LTS recommended |
| [pnpm](https://pnpm.io/installation) 10+ | Repo pins `pnpm@10.28.0` via `packageManager` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Local Postgres for auth, workflows, and integrations |

### Step 1 — Clone and enter the app

```bash
git clone https://github.com/Bleyle823/Graphitti.git
cd Graphitti/graphitti
```

### Step 2 — Install dependencies

```bash
pnpm install
```

### Step 3 — Environment file

Copy the example env file and generate secrets:

```bash
cp .env.example .env.local
```

Edit `.env.local`. **Minimum to boot the UI and sign in:**

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflow
WORKFLOW_EMBEDDED_BASE_URL=http://127.0.0.1:3000
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
INTEGRATION_ENCRYPTION_KEY=
```

Generate secrets (run in a terminal):

```bash
# BETTER_AUTH_SECRET
openssl rand -base64 32

# INTEGRATION_ENCRYPTION_KEY (64 hex chars)
openssl rand -hex 32
```

Paste the outputs into `.env.local`. Keep `WORKFLOW_EMBEDDED_BASE_URL` on port **3000** unless you change the dev server port—otherwise workflow runs can hang on the first node.

Optional for wallet and integration demos (see tables below): Privy, `THEGRAPH_API_KEY`, Circle, Stripe, `TELEGRAM_BOT_TOKEN`, etc. Full list is in `.env.example`.

### Step 4 — Database (Docker + schema)

Start Postgres and apply the Drizzle schema:

```bash
pnpm setup
```

This runs `docker compose up -d` and `pnpm db:push`. If Docker is not running, start Docker Desktop and retry.

Useful database commands:

```bash
pnpm docker:up      # start Postgres only
pnpm docker:down    # stop containers
pnpm docker:logs    # tail Postgres logs
pnpm db:studio      # Drizzle Studio in the browser
```

### Step 5 — Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The dev script runs plugin discovery, then Next.js.

### Step 6 — First run in the browser

1. Sign in (email or configured OAuth if you added client IDs to `.env.local`).
2. Click **Connect wallet** (requires Privy keys in `.env.local` for embedded wallet flows).
3. Open a starred workflow from the gallery or **Saved workflows**.
4. Click **Run** on a **Manual** trigger.
5. Add **Project Integrations** in the app for Stripe, Telegram, Supabase, or Circle when a template needs them (see [Featured workflows](../docs/workflows/featured-workflows.mdx)).

### Navigate the app

| UI | Path / entry | Use for |
| --- | --- | --- |
| Canvas | `/` (home) after sign-in | Edit graph, **Run**, node logs, plugin sidebar |
| Treasury | Header **Treasury** → `/treasury` | Org wallet, **Fund treasury**, payees, approve intents |
| Integrations | **Settings** → Project Integrations | Keys for Stripe, Telegram, Supabase, Circle, The Graph |
| Saved examples | Sidebar gallery | Starred templates copied on first **Connect wallet** |
| Marketplace | Toolbar or `/hub` | List workflow, Arc USDC pricing |
| Earnings | `/earnings` | Paid listing revenue |

Mintlify runbook (navigation + funding): [Run workflows and fund wallets](../docs/workflows/running-and-funding.mdx).

### Fund wallets before payout workflows

Read-only templates (Uniswap subgraph alert, Kelp row read, Arc DeFi **preflight**) need API keys only—no onchain balance.

| Template family | Wallet | Chain | What to hold |
| --- | --- | --- | --- |
| Payroll batch, Stripe→USDC, Aave keeper, Org waterline | **Org treasury** | Base Sepolia | USDC (6 decimals); top up via **Fund treasury** or [Circle faucet](https://faucet.circle.com) |
| FPL League Top Two (Arc sends) | **Embedded wallet** (yours) | Arc Testnet `5042002` | Native USDC (18 decimals) for sends; prize-pool node is balance-only |
| Privy Gasless Payroll | Privy wallets on pay nodes | Sepolia | ETH payouts; set real `walletId` |
| Arc / marketplace x402 | Buyer or linked wallet | Arc (`5042`) | ERC-20 USDC (6 decimals) at `0x3600…0000` |

**Reminders**

- Set each node’s **network** to the chain you funded (Arc DeFi reads org USDC on **base-sepolia**, not Arc Testnet).
- **User-pays** gas (`PRIVY_GAS_MODE` in `.env.local`) debits **USDC on that chain** for gas—fund USDC, not only payout size.
- FPL **send-on-arc** spends from your embedded wallet, not from the prize-pool address field.

Per-template steps: [Featured workflows](../docs/workflows/featured-workflows.mdx). Full checklist: [running-and-funding](../docs/workflows/running-and-funding.mdx).

### Optional — Integration keys in `.env.local`

| Goal | Variables |
| --- | --- |
| Embedded wallet + treasury | `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `PRIVY_AUTHORIZATION_KEY`, `NEXT_PUBLIC_PRIVY_SIGNER_ID` |
| Subgraph queries | `THEGRAPH_API_KEY` |
| Circle / Arc reads and x402 | `CIRCLE_API_KEY`, optional `PRIVATE_KEY` for marketplace buyer |
| Telegram plugin default | `TELEGRAM_BOT_TOKEN` (or set per integration in the UI) |

Org treasury does not use a separate env var—create it under **Treasury** in the app after Privy is configured.

### Troubleshooting

| Symptom | Fix |
| --- | --- |
| Run stuck on first node | Set `WORKFLOW_EMBEDDED_BASE_URL=http://127.0.0.1:3000` and restart `pnpm dev` |
| `DATABASE_URL` / connection errors | Run `pnpm docker:up` and confirm Docker is healthy |
| Privy / wallet errors | Fill Privy vars; use the same app ID in dashboard allowlist for `http://localhost:3000` |
| The Graph query fails | Add Studio API key to `.env.local` and bind **The Graph** on the query node |

### Production build (local check)

```bash
pnpm build
pnpm start
```

Quality checks before a PR:

```bash
pnpm type-check
pnpm fix
```


Canvas plugins and primary code paths used in shipped examples:

### Privy

Execution layer: embedded wallet, org treasury, policies, payee allowlist, wallet-actions, transfer intents, gasless transactions.

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

Arc USDC (native 18-decimal and ERC-20 6-decimal) on Arc and Arc Testnet, CCTP, App Kit genesis helpers, StableFX, Gateway **x402** marketplace settlement (`GatewayWalletBatched`) on Arc mainnet by default.

| Example workflows | Plugin actions |
| --- | --- |
| Arc DeFi treasury readiness, FPL League Top Two USDC Payouts, marketplace pay | `arc/send-on-arc`, `arc/estimate-bridge`, `arc/get-usdc-erc20-balance`, `circle/get-domains`, `circle/get-usdc-balance`, `circle/pay-x402`, `circle/settle-x402` |

| Env / setup | Source |
| --- | --- |
| `CIRCLE_API_KEY`, optional `CIRCLE_ENTITY_SECRET` | [Circle Developer Console](https://developers.circle.com/) |
| `PRIVATE_KEY` | Arc USDC buyer for marketplace / Gateway deposit (see `.env.example`) |
| Gateway verifier (Arc) | `0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE` |
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

## License

Apache 2.0
