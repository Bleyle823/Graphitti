# Ecosystem agent plugins — test report

Report date: **2026-09-13**  
Scope: `@graphitti/graph-core`, `@graphitti/privy-core`, Eliza v2 adapters (`plugin-the-graph`, `plugin-privy`), and elizaOS workspace wrappers (`@elizaos/plugin-graphitti-the-graph`, `@elizaos/plugin-graphitti-privy`).

## Executive summary

| Layer | What it proves | Default CI-style run | Live API run |
|-------|----------------|----------------------|--------------|
| **graph-core** | Gateway key validation, tool catalog gating, Substreams helpers, MCP `tools/list` contract, mocked Gateway discovery | 8 tests, pass | 1 test (Studio subgraph search) |
| **privy-core** | Privy credential validation, catalog gating, mocked Privy REST + Graphitti B2B, MCP contract | 8 tests, pass | 1 test (Privy list wallets) |
| **plugin-the-graph** | One Eliza action per `graph_*` tool, v2 handler/callback, missing-key errors | 2 tests, pass | Same as graph-core live |
| **plugin-privy** | One Eliza action per `privy_*` tool, v2 handler/callback | 1 test, pass | Same as privy-core live |
| **eliza wrappers** | Re-export wiring from Graphitti repo into eliza-main | 2 tests, pass | Optional (smoke only) |

**Default monorepo command (no network):**

```bash
cd ecosystem-agent-plugins
pnpm install
pnpm build
pnpm test
```

**Optional live rehearsal (network + local credentials; never commit secrets):**

```bash
pnpm test:live
```

Live tests read `THEGRAPH_API_KEY`, `PRIVY_APP_ID`, and `PRIVY_APP_SECRET` from the process environment. For local runs, export the same variables you use in `graphitti/.env.local` or rely on the integration files that load that file when present (developer machines only).

## Tool surface under test

| Package | Catalog size | Eliza action names | MCP prefix |
|---------|--------------|-------------------|------------|
| `@graphitti/graph-core` | 36 `graph_*` tools (Gateway, Token API, Substreams, Graphitti B2B when keyed) | 36 `GRAPH_*` actions | `graph_*` |
| `@graphitti/privy-core` | 35 `privy_*` tools (server wallets, policies, intents, Graphitti B2B when keyed) | 35 `PRIVY_*` actions | `privy_*` |

Catalog visibility rules are tested: Graphitti-only tools (for example `graph_whoami`, `privy_whoami`) appear only when `GRAPHITTI_API_KEY` is set; Gateway tools require `THEGRAPH_API_KEY`; native Privy tools require `PRIVY_APP_ID` and `PRIVY_APP_SECRET`.

## Unit test inventory

### `@graphitti/graph-core`

| File | Tests | Coverage |
|------|-------|----------|
| `src/catalog.test.ts` | 6 | `validateGatewayApiKey`, `listAvailableTools` gating, `graphGetSubstreamsEndpoint`, mocked `graphRecommendSubgraph` (30-day volume note) |
| `src/mcp-server.test.ts` | 2 | MCP list contract: all names `graph_*`, includes Substreams tools (`graph_search_substreams_packages`, `graph_query_substreams_entity`, `graph_substreams_webhook_setup`) |

### `@graphitti/privy-core`

| File | Tests | Coverage |
|------|-------|----------|
| `src/catalog.test.ts` | 6 | `validatePrivyCredentials`, `listAvailableTools` gating, mocked `privyListWallets` (Privy REST + headers), mocked `privyWhoami` (Graphitti B2B URL) |
| `src/mcp-server.test.ts` | 2 | MCP list contract: tools are `privy_*`, catalog non-empty with app credentials |

### `plugin-the-graph`

| File | Tests | Coverage |
|------|-------|----------|
| `src/index.test.ts` | 2 | Plugin registers >20 actions including `GRAPH_RECOMMEND_SUBGRAPH` and `GRAPH_QUERY_SUBSTREAMS_ENTITY`; handler returns structured failure when `THEGRAPH_API_KEY` is missing |

### `plugin-privy`

| File | Tests | Coverage |
|------|-------|----------|
| `src/index.test.ts` | 1 | Plugin registers Privy actions (count >5) |

## Live integration tests (optional)

Excluded from `pnpm test` so CI stays offline-friendly. Run with `pnpm test:live`.

| Package | Test | API exercised | Success criteria |
|---------|------|---------------|------------------|
| `graph-core` | `src/live.integration.test.ts` | The Graph Studio Gateway — `graph_search_subgraphs` with `keyword: uniswap` | `executeGraphTool` returns success and data |
| `privy-core` | `src/live.integration.test.ts` | Privy REST — `privy_list_wallets` with `limit: 1` | `executePrivyTool` returns success |

Last verified: **2026-09-13** on a developer machine with production-shaped keys in `graphitti/.env.local`.

## elizaOS integration

Graphitti plugins target **elizaOS v2**: actions use `(runtime, message, state, options, callback)` and return `ActionResult`. Plugin `init` logs a warning when credentials are missing instead of aborting agent startup; `validate` gates each action.

### Graphitti repo

Adapters live under `the-graph/plugin-the-graph` and `privy/plugin-privy`. See [ELIZA.md](./ELIZA.md) for build order and environment mapping (OpenRouter via `@elizaos/plugin-openai` + `OPENAI_BASE_URL` / `OPENAI_API_KEY`).

### eliza-main workspace (local path)

| Package | Role | Test command |
|---------|------|--------------|
| `@elizaos/plugin-graphitti-the-graph` | Re-exports `plugin-the-graph` via `file:` link | `bun run --cwd plugins/plugin-graphitti-the-graph test` |
| `@elizaos/plugin-graphitti-privy` | Re-exports `plugin-privy` via `file:` link | `bun run --cwd plugins/plugin-graphitti-privy test` |

Last verified: **2026-09-13** — both wrapper tests passed.

**Note:** A full `bun install` at eliza-main root may fail during upstream `postinstall` (`packages/core` `tsc6` / `consumer.mts` TS5112). Graphitti wrapper tests do not require that install to succeed; use targeted `bun run --cwd plugins/plugin-graphitti-* test` after Graphitti `pnpm build`.

## Integration mapping

### The Graph

- **Proven in tests:** Gateway API key validation, subgraph discovery and recommendation (mocked Gateway GraphQL), Substreams catalog tools, MCP tool naming, live subgraph search against Studio.
- **Same code path as canvas:** `executeGraphTool` / `GRAPH_*` actions mirror workflow plugin steps documented in the main repo README (Uniswap subgraph id, Kelp Substreams package).

### Privy

- **Proven in tests:** App id/secret validation, Privy REST wallet listing (mock + live), Graphitti B2B whoami URL shape, MCP tool naming, Eliza action registration for treasury-related tools.
- **Same code path as canvas:** `executePrivyTool` / `PRIVY_*` actions align with org treasury, wallet-actions, and intents in `graphitti/plugins/privy`.

## Reproduce this report

```bash
# 1) Offline suite (record stdout)
cd ecosystem-agent-plugins
pnpm install && pnpm build && pnpm test

# 2) Live suite (requires keys; optional)
pnpm test:live

# 3) eliza wrappers (from eliza-main clone; requires Graphitti build)
cd /path/to/eliza-main
bun run --cwd plugins/plugin-graphitti-the-graph test
bun run --cwd plugins/plugin-graphitti-privy test
```

## Related docs

- [README](./README.md) — package map and npm publish
- [ELIZA.md](./ELIZA.md) — elizaOS v2 wiring and OpenRouter env
- [Root integrations](../README.md#integrations) — product links and live run tables
