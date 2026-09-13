<p align="center">
  <video src="docs/media/graphitti-workflow-demo.mp4" width="720" controls playsinline>
    Your browser does not support embedded video. <a href="docs/media/graphitti-workflow-demo.mp4">Download the Graphitti workflow demo</a>.
  </video>
</p>

# Graphitti

Graphitti is the execution layer for businesses, users, and developers onchain: visual workflows that watch chain state (The Graph), send USDC (Privy and Arc), and sell the same graph per call over Circle Gateway x402.

| Link | URL |
|------|-----|
| App | [graphitti-five.vercel.app](https://graphitti-five.vercel.app) |
| Docs | [Mintlify site](docs/) — `mint dev` in `docs/`; start with [Run workflows and fund wallets](docs/workflows/running-and-funding.mdx) |
| Repository | [github.com/Bleyle823/Graphitti](https://github.com/Bleyle823/Graphitti) |
| Demo video | [Workflow demo](docs/media/graphitti-workflow-demo.mp4) (embedded above) |
| npm | [`@graphitti/graph-core`](https://www.npmjs.com/package/@graphitti/graph-core), [`@graphitti/privy-core`](https://www.npmjs.com/package/@graphitti/privy-core) |

## Architecture

```mermaid
flowchart LR
  subgraph triggers [Triggers]
    Manual[Manual / Schedule / Webhook / Block]
  end

  subgraph data [The Graph]
    GQL[Gateway GraphQL subgraphs]
    SS[Substreams registry + SQL sink]
  end

  subgraph circle [Circle on Arc Testnet]
    CCTP[CCTP bridge]
    GW[Gateway x402 nanopayments]
    AppKit[App Kit genesis flows]
  end

  subgraph privy [Privy execution]
    Embed[Embedded wallet]
    Org[Org treasury wallet]
    Policy[Policies and payee allowlist]
    Intent[Transfer intents + quorum]
  end

  triggers --> data
  data -->|conditions / alerts| privy
  data --> circle
  circle -->|Arc USDC / CCTP| privy
  privy -->|wallet-actions / gasless tx| BaseSepolia[Base Sepolia USDC payroll]
  GW -->|marketplace PAYMENT-SIGNATURE| Org
```

Drop product screenshots under [`docs/images/product/`](docs/images/product/) (see that folder for filenames). Suggested captures:

| Slot | Alt text |
|------|----------|
| `privy-connect.png` | Privy connect modal |
| `uniswap-subgraph-canvas.png` | Uniswap V3 subgraph workflow on canvas |
| `kelp-canvas.png` | Kelp backing monitor graph |
| `supabase-backing-snapshots.png` | Supabase Table Editor `backing_snapshots` |
| `arc-defi-readiness.png` | Arc DeFi treasury readiness (CCTP / estimate / Arc USDC) |
| `marketplace-pay.png` | Marketplace pay toast or Earnings |
| `treasury-intent-approve.png` | Treasury 10 USDC cap, payee book, pending intent Approve |

## Featured workflows

Each template is available in the app workflow gallery. Problem, graph, and stack in brief:

| Workflow | What it does | Stack |
|----------|--------------|-------|
| **Uniswap V3 large swap alert (subgraph)** | Large swaps on Ethereum mainnet cross a threshold; notify via Telegram | The Graph Gateway GraphQL, Condition, Telegram |
| **Kelp rsETH Backing Monitor (Substreams → Supabase)** | Stream backing metrics; alert when `should_alert` | Substreams SQL sink, Supabase, Condition, webhook |
| **Arc DeFi treasury readiness** | Preflight funded source chain, CCTP, Arc USDC before DeFi steps | Arc App Kit, CCTP, Circle, Telegram |
| **FPL League Top Two USDC Payouts** | Conditional USDC payouts to league top two when prize pool covers amounts | FPL reads, Arc `send-on-arc`, Condition |
| **Payroll batch with intent fallback** | Transfers under policy cap via wallet-actions; larger amounts via intent + approval | Privy org treasury, policies, intents, Base Sepolia USDC |
| **Stripe invoice to Privy USDC settlement** | Invoice paid in Stripe; settle to org treasury in USDC | Stripe, Privy wallet-actions |
| **Privy Gasless Payroll** | Gasless payroll transfers from org wallet | Privy gasless transactions |
| **Aave Uniswap USDC keeper** | Keeper-style reads across Aave and Uniswap subgraph data | The Graph, protocol read nodes |
| **Org USDC waterline keeper** | Monitor org USDC balance against a waterline | Treasury reads, Condition |

More templates and marketplace listings use the same plugins; see [docs/treasury/overview.mdx](docs/treasury/overview.mdx).

## Integrations

GitHub links point at `main`. Tables below are code, test runs, and onchain ids from rehearsal. Replace `YOUR_LINK` with explorer URLs, payment IDs, or screenshots you collect.

### Privy

Privy is the execution layer: embedded wallets for users, organization treasuries with policies and intents for B2B flows. Org payroll on **Base Sepolia USDC** uses wallet-actions under a spend cap and transfer intents above the cap.

**Code**

- Embedded login: [privy-app-provider.tsx](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/components/privy/privy-app-provider.tsx#L14-L20)
- Org treasury provision (quorum, org, policies, operator signer): [provision-org-treasury.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/privy/provision-org-treasury.ts#L85-L118)
- Spend cap and payee policy: [policy-rules.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/privy/policy-rules.ts#L1-L45)
- Wallet-actions transfer: [wallet-actions.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/privy/steps/wallet-actions.ts#L186-L218)
- Create transfer intent: [wallet-actions.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/privy/steps/wallet-actions.ts#L349-L365)
- Authorize intent: [privy-client.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/web3/privy-client.ts#L430-L441)
- Payroll 10 USDC and 25 USDC intent template: [b2b-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/b2b-templates.ts#L434-L457)
- Stripe invoice to Privy USDC: [b2b-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/b2b-templates.ts#L481-L554)
- Eliza `plugin-privy`: [plugin-privy/src/index.ts](https://github.com/Bleyle823/Graphitti/blob/main/ecosystem-agent-plugins/privy/plugin-privy/src/index.ts#L70-L78)

**Automated tests (2026-09-13)**

| Suite | Scope | Result |
|-------|--------|--------|
| `ecosystem-agent-plugins` → `pnpm test` | `@graphitti/privy-core` catalog, MCP contract, mocked Privy REST + Graphitti B2B; `plugin-privy` Eliza v2 actions | **Pass** (9 tests in Privy stack) |
| `ecosystem-agent-plugins` → `pnpm test:live` | Live `privy_list_wallets` against Privy API | **Pass** (local credentials) |
| eliza-main → `@elizaos/plugin-graphitti-privy` | Wrapper re-export smoke test | **Pass** |

Reproduce: [ecosystem-agent-plugins/TEST-REPORT.md](ecosystem-agent-plugins/TEST-REPORT.md). Full report also summarized in [README — Agent plugin test report](#agent-plugin-test-report).

**What ran**

| Item | Value |
|------|--------|
| Wallet-actions id | `92129062-ea37-475a-8e03-2fe0bcbf5471` |
| Intent id | `evlpevgy5djge5ejfooikzac` |
| Org wallet id (rehearsal) | `y8tvl51nautul1qs3znzboz6` |
| Nested transfer tx (Base Sepolia, intent) | [0x1060…d49ae](https://sepolia.basescan.org/tx/0x1060dded248ffc646e3854c00c2baf0fe079cb89769c65f453add837d9ad49ae) (Privy action `f9bc57a7-1d04-41c0-9479-b7e1ae669b67`; rehearsal may show `rejected` if treasury lacks gas) |
| Wallet-actions tx (Base Sepolia) | [0x41cb…3e2e](https://sepolia.basescan.org/tx/0x41cba6be5f40b9e2a490b5ce45a0fa6d81a4b072ba2c368ea8bd66df0fbd3e2e) |
| Org treasury address (explorer) | YOUR_LINK |
| Screenshot | `docs/images/product/privy-connect.png`, `treasury-intent-approve.png` |

Verify onchain status locally: `graphitti/scripts/verify-privy-transactions.ts` (requires Privy credentials in `.env.local`).

### Arc and Circle

Arc Testnet (`eip155:5042002`) hosts native and ERC-20 USDC, CCTP domain 26, Circle Gateway x402 marketplace settlement (`GatewayWalletBatched`), and App Kit genesis helpers (Iris attestations, swap quotes).

**Arc chain**

- App Kit genesis: [app-kit-flows.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/arc/app-kit-flows.ts#L1-L33)
- Arc Testnet chain config: [chains.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/web3/chains.ts#L74-L84)
- ERC-20 USDC vs native: [chains.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/web3/chains.ts#L17-L18)
- Native send: [arc/steps/send.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/arc/steps/send.ts#L18-L43)
- FPL Arc payouts: [fpl-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/fpl-templates.ts#L248-L271)
- Arc DeFi preflight: [plugin-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/plugin-templates.ts#L1048-L1050)

**CCTP**

- Bridge action: [arc/index.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/arc/index.ts#L79-L82)

**Gateway x402**

- Marketplace constants: [constants.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/marketplace/constants.ts#L12-L27)
- x402 challenge: [x402.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/marketplace/x402.ts#L42-L73)
- Sign `GatewayWalletBatched`: [nanopayments.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/circle/steps/nanopayments.ts#L319-L334)

**What ran**

| Item | Value |
|------|--------|
| Gateway verifying contract (Arc Testnet) | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Gateway activity wallet (Arc Testnet) | [`0xfb526dC52755ba99F7d952e8385bBAAc572F00c9`](https://testnet.arcscan.app/address/0xfb526dC52755ba99F7d952e8385bBAAc572F00c9) |
| Arc native USDC send (Arcscan) | YOUR_LINK |
| CCTP burn or mint tx | YOUR_LINK |
| Marketplace `paymentId` or PAYMENT-SIGNATURE | YOUR_LINK |
| Screenshot | `docs/images/product/arc-defi-readiness.png`, `marketplace-pay.png` |

Open that Gateway activity wallet on [Arcscan](https://testnet.arcscan.app/address/0xfb526dC52755ba99F7d952e8385bBAAc572F00c9) and in Circle Gateway to see x402 marketplace deposits and nanopayments on Arc Testnet.

The product targets Arc Testnet today and is structured to move to Arc mainnet when you deploy there. Marketplace revenue is Arc ERC-20 USDC via x402.

### The Graph

Canvas actions query live subgraphs and Substreams packages. Agent packages reuse the same surface via `plugin-the-graph` and `@graphitti/graph-core`.

**Code**

- Query subgraph action: [the-graph/index.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/plugins/the-graph/index.ts#L241-L246)
- Uniswap V3 large swap template: [plugin-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/plugin-templates.ts#L533-L579)
- Kelp Substreams to Supabase: [monitor-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/monitor-templates.ts#L478-L509)
- Kelp package slug: [kelp-substreams-deployments.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/the-graph/kelp-substreams-deployments.ts#L15)
- Eliza `plugin-the-graph`: [plugin-the-graph/src/index.ts](https://github.com/Bleyle823/Graphitti/blob/main/ecosystem-agent-plugins/the-graph/plugin-the-graph/src/index.ts#L70-L78)

**Automated tests (2026-09-13)**

| Suite | Scope | Result |
|-------|--------|--------|
| `ecosystem-agent-plugins` → `pnpm test` | `@graphitti/graph-core` Gateway key rules, Substreams tools, MCP `graph_*` list, mocked recommend/search; `plugin-the-graph` Eliza v2 handlers | **Pass** (10 tests in Graph stack) |
| `ecosystem-agent-plugins` → `pnpm test:live` | Live `graph_search_subgraphs` (Studio Gateway, keyword `uniswap`) | **Pass** (local `THEGRAPH_API_KEY`) |
| eliza-main → `@elizaos/plugin-graphitti-the-graph` | Wrapper re-export smoke test | **Pass** |

Reproduce: [ecosystem-agent-plugins/TEST-REPORT.md](ecosystem-agent-plugins/TEST-REPORT.md). Full report also summarized in [README — Agent plugin test report](#agent-plugin-test-report).

**What ran**

| Item | Value |
|------|--------|
| Uniswap V3 subgraph id (Gateway GraphQL) | `5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV` |
| Kelp Substreams package | `kelp-rseth-backing-alerts` |
| Subgraph Studio or Explorer URL | YOUR_LINK |
| Screenshot | `docs/images/product/uniswap-subgraph-canvas.png`, `kelp-canvas.png` |

**Supabase (Kelp SQL sink)** — nested under The Graph data path

| Item | Value |
|------|--------|
| Table | `backing_snapshots` |
| Workflow row read | [monitor-templates.ts](https://github.com/Bleyle823/Graphitti/blob/main/graphitti/lib/workflow-templates/monitor-templates.ts#L478-L509) |
| Substreams package docs | [substreams/README.md](substreams/README.md) |
| Table Editor screenshot | YOUR_LINK or `docs/images/product/supabase-backing-snapshots.png` |

Uniswap **contract** swap actions exist in the protocol plugin pack; featured examples use **subgraph reads only**, not on-chain router execution.

## Agent plugin test report

Automated coverage for agent plugin integrations (The Graph + Privy). Detailed file-level inventory: **[ecosystem-agent-plugins/TEST-REPORT.md](ecosystem-agent-plugins/TEST-REPORT.md)**.

### Summary (2026-09-13)

| Package | Tools / actions | Offline tests | Live tests |
|---------|-----------------|---------------|------------|
| `@graphitti/graph-core` | 36 `graph_*` | 8 passed | 1 passed (Gateway subgraph search) |
| `@graphitti/privy-core` | 35 `privy_*` | 8 passed | 1 passed (Privy list wallets) |
| `plugin-the-graph` (Eliza v2) | 36 `GRAPH_*` | 2 passed | Uses graph-core live |
| `plugin-privy` (Eliza v2) | 35 `PRIVY_*` | 1 passed | Uses privy-core live |
| `@elizaos/plugin-graphitti-*` (eliza-main) | Re-exports above | 2 passed (smoke) | — |

**Total default offline run:** 19 tests (`pnpm test` in `ecosystem-agent-plugins`).  
**Optional live run:** 2 tests (`pnpm test:live`; requires local keys, same as `graphitti/.env.local`).

### What the tests demonstrate

- **The Graph:** Studio Gateway key validation, subgraph discovery and recommendation (unit + mocked GraphQL), Substreams tool surface in MCP and Eliza, live subgraph search rehearsal.
- **Privy:** App credential validation, server wallet REST integration (unit mock + live list), Graphitti B2B tool gating, Eliza v2 action parity with MCP catalog.
- **Agents:** Same npm cores power MCP stdio servers, Eliza plugins, and Eve/OpenClaw/Hermes adapters under `ecosystem-agent-plugins/`.

### Reproduce

```bash
cd ecosystem-agent-plugins
pnpm install && pnpm build && pnpm test
pnpm test:live   # optional; network + THEGRAPH_API_KEY / Privy app credentials
```

elizaOS wrappers (separate clone): see [ecosystem-agent-plugins/ELIZA.md](ecosystem-agent-plugins/ELIZA.md).

## How to try it

### Hosted app (fastest)

1. Open [graphitti-five.vercel.app](https://graphitti-five.vercel.app).
2. Sign in and click **Connect wallet** (embedded Privy wallet for gasless steps and Arc sends).
3. Open **Saved workflows** or the starred gallery and pick a template.
4. **Settings → Project Integrations** — add The Graph, Telegram, Stripe, Supabase, or Circle; bind each on the node inspector.
5. For payroll, Stripe, or keeper payouts: **Treasury** → create org → **Fund treasury** with **Base Sepolia USDC** ([Circle faucet](https://faucet.circle.com)).
6. For **FPL Arc payouts**: fund your **embedded wallet** on **Arc Testnet** with native USDC (18 decimals); set prize-pool address on the balance node to a funded Arc address.
7. Click **Run** on a **Manual** trigger; read per-node logs.

Full navigation, funding matrix, and per-workflow checklist: **[docs — Run workflows and fund wallets](docs/workflows/running-and-funding.mdx)** (Mintlify) or run `mint dev` in `docs/`.

Per-template steps (Telegram chat id, Stripe `cus_`, placeholders): **[docs/workflows/featured-workflows.mdx](docs/workflows/featured-workflows.mdx)**.

### Local development

See **[graphitti/README.md](graphitti/README.md)** — Postgres, `.env.local`, `pnpm dev`, and first browser run.

### Monorepo map

| Path | What it is |
| --- | --- |
| [`graphitti/`](graphitti/) | Next.js app: canvas, **Treasury**, **Project Integrations**, marketplace |
| [`docs/`](docs/) | Mintlify docs (`mint dev`) |
| [`ecosystem-agent-plugins/`](ecosystem-agent-plugins/) | Agent MCP + Eliza packages |
| [`substreams/`](substreams/) | Kelp Substreams + Supabase sink |
| [`landing/`](landing/) | Marketing site |

### Wallet reminder (short)

| Flow type | Wallet to fund | Chain | Asset |
| --- | --- | --- | --- |
| Org payroll, Stripe→USDC, keepers, waterline | **Org treasury** | Base Sepolia | USDC (6 dec); keep USDC for gas if user-pays mode |
| FPL Arc sends, some Web3 writes | **Embedded** (Connect wallet) | Arc Testnet | Native USDC (18 dec) |
| Subgraph / Kelp read / Arc DeFi preflight | None for onchain reads | — | API keys only |
| Privy Gasless Payroll | Privy **wallet id** on nodes | Sepolia | ETH to recipients |

Arc marketplace settlement and paid listings use **Arc Testnet ERC-20 USDC** (6 decimals). Do not mix Arc native (18 dec) and ERC-20 (6 dec) amounts on the same field.

## Live vs mock

| Capability | Status |
|------------|--------|
| The Graph Gateway GraphQL and Kelp Substreams SQL sink | Live data (sink must run for Kelp freshness) |
| Privy wallet-actions, intents, gasless payroll | Live on configured networks |
| Arc Testnet USDC, CCTP, Gateway x402 marketplace | Live on Arc Testnet (`5042002`) |
| Privy card onramp in UI | Mock UI only; qualifying money paths use wallet-actions and intents |
| Gasless writes | Privy gasless transactions where configured |
| Uniswap in featured demos | Subgraph queries via The Graph, not router swaps |

## Monorepo map

- [`graphitti/`](graphitti/) — Next.js app: canvas, treasury, marketplace, plugins
- [`ecosystem-agent-plugins/`](ecosystem-agent-plugins/) — `@graphitti/graph-core`, `@graphitti/privy-core`, Eliza/Eve adapters, MCP servers
- [`substreams/`](substreams/) — Kelp rsETH backing Substreams package and Supabase SQL sink
- [`docs/`](docs/) — Mintlify product documentation
- [`landing/`](landing/) — Marketing site

## License

Apache 2.0 — see [graphitti/README.md](graphitti/README.md).
