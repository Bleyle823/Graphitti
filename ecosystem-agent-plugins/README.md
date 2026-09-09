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
pnpm --filter @graphitti/graph-core build
pnpm --filter @graphitti/privy-core build
```

## Documentation

- [The Graph agent plugins](../docs/plugins/agent-the-graph.mdx)
- [Privy agent plugins](../docs/plugins/agent-privy.mdx)
