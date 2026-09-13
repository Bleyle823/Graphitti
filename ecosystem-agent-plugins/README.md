# Ecosystem agent plugins

Reusable agent tools for The Graph and Privy: npm core catalogs, MCP stdio servers, and runtime adapters (Eliza, Eve, OpenClaw, Hermes). Agents and Cursor can query subgraphs, stream Substreams metadata, and drive the same Privy treasury flows as the Graphitti canvas.

Privy packages live under `privy/`. The Graph packages live under `the-graph/`.

![Agent plugin screenshot](YOUR_SCREENSHOT.png)

Replace `YOUR_SCREENSHOT.png` with a capture of MCP tools or an Eliza agent calling `graph_*` / `privy_*` actions.

## Commands

From this directory:

```bash
pnpm install
pnpm build
pnpm test
```

Optional live API rehearsal (uses your local env; not for CI):

```bash
pnpm test:live
```

Full test matrix, last-run status, and elizaOS steps: **[TEST-REPORT.md](./TEST-REPORT.md)**. elizaOS wiring: **[ELIZA.md](./ELIZA.md)**.

### Latest automated results (2026-09-13)

| Suite | Command | Result |
|-------|---------|--------|
| Cores + Eliza adapters | `pnpm test` | **19 tests passed** (graph-core 8, privy-core 8, plugin-the-graph 2, plugin-privy 1) |
| Live Gateway + Privy REST | `pnpm test:live` | **2 tests passed** (subgraph search, list wallets) |
| elizaOS wrappers | `bun run --cwd plugins/plugin-graphitti-* test` in eliza-main | **2 tests passed** (re-export smoke) |

Build core packages first if you only need MCP binaries:

```bash
pnpm --filter @graphitti/graph-core build
pnpm --filter @graphitti/privy-core build
```

## Published packages

Core catalogs are published to npm:

- [`@graphitti/graph-core`](https://www.npmjs.com/package/@graphitti/graph-core) — The Graph tool catalog and `graph-mcp` MCP server
- [`@graphitti/privy-core`](https://www.npmjs.com/package/@graphitti/privy-core) — Privy tool catalog and `privy-mcp` MCP server

```bash
npm install @graphitti/graph-core @graphitti/privy-core
```

## Documentation

- **[TEST-REPORT.md](./TEST-REPORT.md)** — comprehensive automated test report (unit, live, elizaOS)
- [ELIZA.md](./ELIZA.md) — elizaOS v2 integration
- [The Graph agent plugins](../docs/plugins/agent-the-graph.mdx)
- [Privy agent plugins](../docs/plugins/agent-privy.mdx)
- [Repository README](../README.md) — integration evidence and featured workflows
