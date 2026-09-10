# @sugarhi11/graph-core

Shared tool catalog and MCP stdio server for The Graph protocol agent plugins. Exposes `graph_*` tools for subgraph discovery, GraphQL queries, Token API reads, Substreams registry operations, and optional Graphitti workflow APIs.

## Install

```bash
npm install @sugarhi11/graph-core
```

## MCP server

Run the stdio MCP server after setting credentials:

```bash
export THEGRAPH_API_KEY=your_32_char_studio_key
npx graph-mcp
```

## Credentials

| Variable | Required | Purpose |
|---|---|---|
| `THEGRAPH_API_KEY` | Yes | 32-character Studio/gateway key |
| `SUBSTREAMS_API_KEY` | No | Substreams registry and data plane |
| `THEGRAPH_MARKET_BEARER` | No | Market Portal billing reads |
| `GRAPHITTI_BASE_URL` | No | Graphitti host override |
| `GRAPHITTI_API_KEY` | No | Graphitti B2B and marketplace APIs |

## Programmatic use

```typescript
import { executeGraphTool, listAvailableTools } from "@sugarhi11/graph-core";
```

## Documentation

See [The Graph agent plugins](https://github.com/Bleyle823/Graphitti/blob/main/docs/plugins/agent-the-graph.mdx) in the Graphitti repo.
