# Hermes The Graph plugin

Portable Hermes agent plugin for The Graph protocol tools (`graph_*`). Includes an MCP stdio server via `@sugarhi11/graph-core`.

## Install

```bash
hermes plugins install /path/to/ecosystem-agent-plugins/the-graph/hermes-the-graph
hermes plugins enable the-graph
```

## MCP configuration

The MCP server runs `graph-mcp` from `@sugarhi11/graph-core`. Configure env vars in `~/.hermes/config.yaml` under `mcp_servers.the-graph`:

| Variable | Required |
|---|---|
| `THEGRAPH_API_KEY` | Yes |
| `SUBSTREAMS_API_KEY` | No |
| `THEGRAPH_MARKET_BEARER` | No |
| `GRAPHITTI_BASE_URL` | No |
| `GRAPHITTI_API_KEY` | No |

See `mcp.json` for the default server definition.

## Skills

Agent guidance lives in `skills/the-graph/SKILL.md` with reference docs in `skills/the-graph/references/`.
