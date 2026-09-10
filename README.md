# Graphitti

Workflow automation platform with a visual builder, protocol plugins, marketplace, and agent integrations.

## Published packages

Core agent plugin catalogs are published on npm under the `@graphitti` scope:

- [`@graphitti/graph-core`](https://www.npmjs.com/package/@graphitti/graph-core) — The Graph tool catalog and `graph-mcp` MCP server
- [`@graphitti/privy-core`](https://www.npmjs.com/package/@graphitti/privy-core) — Privy tool catalog and `privy-mcp` MCP server

```bash
npm install @graphitti/graph-core @graphitti/privy-core
```

See [ecosystem-agent-plugins/README.md](ecosystem-agent-plugins/README.md) for workspace layout and adapter packages.

## Repositories

| Directory | Description |
|-----------|-------------|
| [`graphitti/`](graphitti/) | Main Next.js application |
| [`ecosystem-agent-plugins/`](ecosystem-agent-plugins/) | Agent plugin cores and runtime adapters |
| [`docs/`](docs/) | Public documentation (Mintlify) |
| [`landing/`](landing/) | Marketing site |
