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

- [The Graph agent plugins](../docs/plugins/agent-the-graph.mdx)
- [Privy agent plugins](../docs/plugins/agent-privy.mdx)
- [Repository README](../README.md) — integration evidence and featured workflows
