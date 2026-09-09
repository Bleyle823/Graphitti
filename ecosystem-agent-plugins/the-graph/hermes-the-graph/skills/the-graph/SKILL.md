# The Graph protocol tools

Use these tools when the user asks about onchain indexed data, subgraphs, Substreams, or Graphitti Graph workflows.

## Subgraph discovery sequence (required)

1. Start with a generic keyword (`graph_search_subgraphs` or `graph_recommend_subgraph`).
2. Always check 30-day query volume before selecting a deployment (`graph_get_query_counts` or use `graph_recommend_subgraph` which attaches counts).
3. Fetch schema (`graph_get_schema`) before writing GraphQL.
4. Query with `graph_query_subgraph` using THEGRAPH_API_KEY on the gateway URL. Never auto-pay x402.

For contract addresses, use `graph_find_by_contract` with chain `mainnet` for Ethereum (not `ethereum`).

## Substreams

- Registry: `graph_search_substreams_packages`, `graph_get_substreams_package`, `graph_get_substreams_endpoint`
- Setup: `graph_resolve_substreams_package` returns deploy checklist
- Read indexed output: `graph_query_substreams_entity` (subgraph fed by graph_out module)
- Push alerts: `graph_substreams_webhook_setup` returns `substreams sink webhook` CLI + Graphitti webhook URL
- gRPC runs outside the agent; do not expect in-process streaming in v1

## Graphitti workflows

When `GRAPHITTI_API_KEY` is set:

- `graph_search_workflows` with category `the-graph`
- `graph_call_workflow` for listed marketplace flows
- `graph_execute_workflow` for owned workflow ids

## Credentials

- `THEGRAPH_API_KEY` — 32-char Studio/gateway key (required)
- `SUBSTREAMS_API_KEY` — Substreams registry/data plane (optional)
- `THEGRAPH_MARKET_BEARER` — Market Portal reads (optional)
- `GRAPHITTI_API_KEY` — Graphitti B2B/marketplace (optional)
