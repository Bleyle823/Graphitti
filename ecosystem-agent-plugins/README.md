# Ecosystem agent plugins

Shared agent plugin packages for Graphitti ecosystem protocols. Each protocol has a core catalog (`graph_*` or `privy_*` tools), runtime adapters (Eliza, OpenClaw, Eve, Hermes), and an MCP stdio server.

Privy packages live under `privy/`. The Graph packages live under `the-graph/`.

## Commands

From this directory:

```bash
pnpm install
pnpm build
pnpm test
```

Build core packages first if you only need MCP binaries:

```bash
pnpm --filter @bleyle823/graph-core build
pnpm --filter @bleyle823/privy-core build
```

## Published packages

Core catalogs are published to npm:

- [`@bleyle823/graph-core`](https://www.npmjs.com/package/@bleyle823/graph-core) — The Graph tool catalog and `graph-mcp` MCP server
- [`@bleyle823/privy-core`](https://www.npmjs.com/package/@bleyle823/privy-core) — Privy tool catalog and `privy-mcp` MCP server

```bash
npm install @bleyle823/graph-core @bleyle823/privy-core
```

## Documentation

- [The Graph agent plugins](../docs/plugins/agent-the-graph.mdx)
- [Privy agent plugins](../docs/plugins/agent-privy.mdx)
