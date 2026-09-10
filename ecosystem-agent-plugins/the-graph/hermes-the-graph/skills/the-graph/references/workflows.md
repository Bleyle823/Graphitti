# Graphitti workflow tools

When `GRAPHITTI_API_KEY` is set, the plugin adds workflow tools:

| Tool | Purpose |
|---|---|
| `graph_search_workflows` | Search listed workflows with category `the-graph` |
| `graph_get_listing` | Read a marketplace listing by slug |
| `graph_call_workflow` | Execute a listed marketplace flow |
| `graph_execute_workflow` | Execute an owned workflow by id |
| `graph_get_execution` | Poll execution status |
| `graph_whoami` | Verify API key and scopes |

## Substreams + Graphitti composition

1. Run `graph_substreams_webhook_setup` to get sink webhook CLI and Graphitti webhook URL.
2. Execute the webhook workflow with `graph_call_workflow`.
