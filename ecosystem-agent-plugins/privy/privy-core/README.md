# @bleyle823/privy-core

Shared tool catalog and MCP stdio server for Privy wallet and treasury agent plugins. Exposes `privy_*` tools for native Privy REST (wallets, signing, transfers, policies, intents) and Graphitti-backed workflows and org treasury.

## Install

```bash
npm install @bleyle823/privy-core
```

## MCP server

Run the stdio MCP server after setting credentials:

```bash
export PRIVY_APP_ID=your_app_id
export PRIVY_APP_SECRET=your_app_secret
npx privy-mcp
```

## Credentials

| Variable | Required | Purpose |
|---|---|---|
| `PRIVY_APP_ID` | Yes | Privy application ID |
| `PRIVY_APP_SECRET` | Yes | Privy application secret |
| `PRIVY_AUTHORIZATION_KEY` | No | Policy-gated wallet RPC signing |
| `GRAPHITTI_BASE_URL` | No | Graphitti host override |
| `GRAPHITTI_API_KEY` | No | Graphitti B2B, treasury, and marketplace APIs |

## Programmatic use

```typescript
import { executePrivyTool, listAvailableTools } from "@bleyle823/privy-core";
```

## Documentation

See [Privy agent plugins](https://github.com/Bleyle823/Graphitti/blob/main/docs/plugins/agent-privy.mdx) in the Graphitti repo.
