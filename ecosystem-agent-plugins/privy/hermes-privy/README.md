# Hermes Privy plugin

Portable Hermes agent plugin for Privy wallet and treasury tools (`privy_*`). Includes an MCP stdio server via `@graphitti/privy-core`.

## Install

```bash
hermes plugins install /path/to/ecosystem-agent-plugins/privy/hermes-privy
hermes plugins enable privy
```

## MCP configuration

The MCP server runs `privy-mcp` from `@graphitti/privy-core`. Configure env vars in `~/.hermes/config.yaml` under `mcp_servers.privy`:

| Variable | Required |
|---|---|
| `PRIVY_APP_ID` | Yes |
| `PRIVY_APP_SECRET` | Yes |
| `PRIVY_AUTHORIZATION_KEY` | No |
| `GRAPHITTI_BASE_URL` | No |
| `GRAPHITTI_API_KEY` | No |

See `mcp.json` for the default server definition.

## Skills

Agent guidance lives in `skills/privy/SKILL.md` with reference docs in `skills/privy/references/`.
