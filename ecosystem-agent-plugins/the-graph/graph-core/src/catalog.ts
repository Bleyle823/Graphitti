import {
  graphFindByContract,
  graphGetQueryCounts,
  graphGetSchema,
  graphGetSubgraphDetail,
  graphRecommendSubgraph,
  graphSearchSubgraphs,
} from "./discovery.js";
import {
  graphCallWorkflow,
  graphExecuteWorkflow,
  graphGetExecution,
  graphGetListing,
  graphSearchWorkflows,
  graphWhoami,
} from "./graphitti-client.js";
import {
  graphGetActiveConnections,
  graphGetBillPreview,
  graphGetDeploymentEvents,
  graphGetDeploymentLogs,
  graphGetDeploymentState,
  graphGetSubscription,
  graphGetUsageSummary,
  graphListHostedDeployments,
} from "./market-actions.js";
import {
  graphGetIndexingStatus,
  graphQueryLendingSnapshot,
  graphQuerySubgraph,
} from "./query-actions.js";
import {
  graphGetSubstreamsEndpoint,
  graphGetSubstreamsPackage,
  graphGetSubstreamsStreamStatus,
  graphQuerySubstreamsEntity,
  graphResolveSubstreamsPackage,
  graphSearchSubstreamsPackages,
  graphSubstreamsRun,
  graphSubstreamsWebhookSetup,
} from "./substreams-actions.js";
import {
  graphGetDexSwaps,
  graphGetNftActivity,
  graphGetTokenBalances,
  graphGetTokenHolders,
  graphGetTokenTransfers,
} from "./token-actions.js";
import type { ExecuteParams, GraphCredentials, GraphToolDefinition, ToolResult } from "./types.js";

export type ToolHandler = (
  params: ExecuteParams,
  credentials: GraphCredentials
) => Promise<ToolResult>;

const keywordProp = { type: "string", description: "Search keyword" };
const subgraphIdProp = { type: "string", description: "Subgraph id from Explorer" };
const networkProp = { type: "string", description: "Network (mainnet, base, arbitrum-one, …)" };

export const GRAPH_TOOL_HANDLERS: Record<string, ToolHandler> = {
  graph_search_subgraphs: graphSearchSubgraphs,
  graph_get_query_counts: graphGetQueryCounts,
  graph_recommend_subgraph: graphRecommendSubgraph,
  graph_find_by_contract: graphFindByContract,
  graph_get_schema: graphGetSchema,
  graph_query_subgraph: graphQuerySubgraph,
  graph_get_subgraph_detail: graphGetSubgraphDetail,
  graph_get_indexing_status: graphGetIndexingStatus,
  graph_query_lending_snapshot: graphQueryLendingSnapshot,
  graph_get_token_balances: graphGetTokenBalances,
  graph_get_token_transfers: graphGetTokenTransfers,
  graph_get_token_holders: graphGetTokenHolders,
  graph_get_dex_swaps: graphGetDexSwaps,
  graph_get_nft_activity: graphGetNftActivity,
  graph_get_subscription: graphGetSubscription,
  graph_get_usage_summary: graphGetUsageSummary,
  graph_get_bill_preview: graphGetBillPreview,
  graph_get_active_connections: graphGetActiveConnections,
  graph_list_hosted_deployments: graphListHostedDeployments,
  graph_get_deployment_state: graphGetDeploymentState,
  graph_get_deployment_events: graphGetDeploymentEvents,
  graph_get_deployment_logs: graphGetDeploymentLogs,
  graph_search_substreams_packages: graphSearchSubstreamsPackages,
  graph_get_substreams_package: graphGetSubstreamsPackage,
  graph_get_substreams_endpoint: graphGetSubstreamsEndpoint,
  graph_resolve_substreams_package: graphResolveSubstreamsPackage,
  graph_query_substreams_entity: graphQuerySubstreamsEntity,
  graph_get_substreams_stream_status: graphGetSubstreamsStreamStatus,
  graph_substreams_webhook_setup: graphSubstreamsWebhookSetup,
  graph_substreams_run: graphSubstreamsRun,
  graph_whoami: graphWhoami,
  graph_search_workflows: graphSearchWorkflows,
  graph_get_listing: graphGetListing,
  graph_call_workflow: graphCallWorkflow,
  graph_execute_workflow: graphExecuteWorkflow,
  graph_get_execution: graphGetExecution,
};

export const GRAPH_TOOLS: GraphToolDefinition[] = [
  {
    name: "graph_search_subgraphs",
    description:
      "Search The Graph Network by keyword. Follow with graph_get_query_counts or graph_recommend_subgraph before querying.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: { keyword: keywordProp, network: networkProp },
      required: ["keyword"],
    },
  },
  {
    name: "graph_get_query_counts",
    description:
      "Get 30-day query volume (queryFeesAmount) for deployment IPFS hashes. NON-OPTIONAL before selecting a subgraph.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: {
        ipfs_hashes: {
          type: "array",
          items: { type: "string" },
          description: "Qm… IPFS hashes from search results",
        },
      },
      required: ["ipfs_hashes"],
    },
  },
  {
    name: "graph_recommend_subgraph",
    description:
      "Search subgraphs for a goal and return ranked candidates with 30-day query counts attached.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: { goal: keywordProp, network: networkProp },
      required: ["goal"],
    },
  },
  {
    name: "graph_find_by_contract",
    description:
      "Find top subgraph deployments for a contract address and chain. Uses mainnet not ethereum for Ethereum.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: {
        contract_address: { type: "string" },
        chain: networkProp,
      },
      required: ["contract_address", "chain"],
    },
  },
  {
    name: "graph_get_schema",
    description: "Introspect subgraph schema entities and fields before writing GraphQL.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: {
        subgraph_id: subgraphIdProp,
        deployment_id: { type: "string" },
        ipfs_hash: { type: "string" },
      },
    },
  },
  {
    name: "graph_get_subgraph_detail",
    description: "Fetch subgraph metadata, deployment, and query URLs.",
    category: "discovery",
    parameters: {
      type: "object",
      properties: { subgraph_id: subgraphIdProp },
      required: ["subgraph_id"],
    },
  },
  {
    name: "graph_query_subgraph",
    description:
      "Execute GraphQL against a subgraph via Gateway (Bearer THEGRAPH_API_KEY). Never auto-pay x402.",
    category: "query",
    parameters: {
      type: "object",
      properties: {
        subgraph_id: subgraphIdProp,
        deployment_id: { type: "string" },
        ipfs_hash: { type: "string" },
        query: { type: "string" },
        variables: { type: "object" },
      },
      required: ["query"],
    },
  },
  {
    name: "graph_get_indexing_status",
    description: "Read _meta block and deployment sync status for a subgraph.",
    category: "query",
    parameters: {
      type: "object",
      properties: {
        subgraph_id: subgraphIdProp,
        deployment_id: { type: "string" },
        ipfs_hash: { type: "string" },
      },
    },
  },
  {
    name: "graph_query_lending_snapshot",
    description: "Messari-shaped lending protocol and market snapshot query.",
    category: "query",
    parameters: {
      type: "object",
      properties: { subgraph_id: subgraphIdProp, protocol: { type: "string" } },
      required: ["subgraph_id"],
    },
  },
  {
    name: "graph_get_token_balances",
    description: "Token API: EVM balances for an address.",
    category: "token",
    parameters: {
      type: "object",
      properties: { network: networkProp, address: { type: "string" } },
      required: ["network", "address"],
    },
  },
  {
    name: "graph_get_token_transfers",
    description: "Token API: EVM transfers for an address.",
    category: "token",
    parameters: {
      type: "object",
      properties: {
        network: networkProp,
        address: { type: "string" },
        start_time: { type: "string" },
        end_time: { type: "string" },
      },
      required: ["network", "address"],
    },
  },
  {
    name: "graph_get_token_holders",
    description: "Token API: holders for a token contract.",
    category: "token",
    parameters: {
      type: "object",
      properties: { network: networkProp, token: { type: "string" } },
      required: ["network", "token"],
    },
  },
  {
    name: "graph_get_dex_swaps",
    description: "Token API: DEX swaps on a network, optionally filtered by pool.",
    category: "token",
    parameters: {
      type: "object",
      properties: { network: networkProp, pool: { type: "string" } },
      required: ["network"],
    },
  },
  {
    name: "graph_get_nft_activity",
    description: "Token API: NFT transfer activity for a contract.",
    category: "token",
    parameters: {
      type: "object",
      properties: { network: networkProp, address: { type: "string" } },
      required: ["network", "address"],
    },
  },
  {
    name: "graph_search_substreams_packages",
    description: "Search substreams.dev package registry.",
    category: "substreams",
    requiresSubstreamsKey: true,
    parameters: {
      type: "object",
      properties: { query: keywordProp, organization: { type: "string" } },
    },
  },
  {
    name: "graph_get_substreams_package",
    description: "Resolve Substreams package slug to spkg URL and version.",
    category: "substreams",
    parameters: {
      type: "object",
      properties: { slug: { type: "string" }, version: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "graph_get_substreams_endpoint",
    description: "Map network to default StreamingFast gRPC endpoint.",
    category: "substreams",
    parameters: {
      type: "object",
      properties: { network: networkProp },
      required: ["network"],
    },
  },
  {
    name: "graph_resolve_substreams_package",
    description: "Registry lookup plus deploy checklist and endpoint (setup only).",
    category: "substreams",
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string" },
        version: { type: "string" },
        network: networkProp,
      },
      required: ["slug"],
    },
  },
  {
    name: "graph_query_substreams_entity",
    description:
      "Query indexed Substreams graph_out entities via subgraph GraphQL. Does not start gRPC.",
    category: "substreams",
    parameters: {
      type: "object",
      properties: {
        subgraph_id: subgraphIdProp,
        entity_name: { type: "string" },
        where_json: { type: "string" },
        first: { type: "number" },
      },
      required: ["subgraph_id", "entity_name"],
    },
  },
  {
    name: "graph_get_substreams_stream_status",
    description: "Check subgraph _meta sync for a Substreams-backed deployment.",
    category: "substreams",
    parameters: {
      type: "object",
      properties: { subgraph_id: subgraphIdProp },
      required: ["subgraph_id"],
    },
  },
  {
    name: "graph_substreams_webhook_setup",
    description:
      "Return substreams sink webhook CLI command and Graphitti webhook URL template.",
    category: "substreams",
    optional: true,
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string" },
        version: { type: "string" },
        module_name: { type: "string" },
        network: networkProp,
        workflow_id: { type: "string" },
        base_url: { type: "string" },
      },
    },
  },
  {
    name: "graph_substreams_run",
    description:
      "Optional bounded Substreams gRPC run (v1 returns guidance; use entity query or external sink).",
    category: "substreams",
    optional: true,
    requiresSubstreamsKey: true,
    parameters: {
      type: "object",
      properties: {
        slug: { type: "string" },
        module: { type: "string" },
        max_messages: { type: "number" },
      },
      required: ["slug", "module"],
    },
  },
  {
    name: "graph_get_subscription",
    description: "Market Portal: organization subscription (THEGRAPH_MARKET_BEARER).",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: { organization_id: { type: "string" } },
    },
  },
  {
    name: "graph_get_usage_summary",
    description: "Market Portal: usage summary by organization.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: { organization_id: { type: "string" } },
    },
  },
  {
    name: "graph_get_bill_preview",
    description: "Market Portal: bill preview.",
    category: "market",
    requiresMarketBearer: true,
    parameters: { type: "object", properties: { organization_id: { type: "string" } } },
  },
  {
    name: "graph_get_active_connections",
    description: "Market Portal: active connections.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: { organization_id: { type: "string" } },
    },
  },
  {
    name: "graph_list_hosted_deployments",
    description: "Market Portal: list hosted Substreams deployments.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: { organization_id: { type: "string" } },
    },
  },
  {
    name: "graph_get_deployment_state",
    description: "Market Portal: hosted deployment state.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: { deployment_id: { type: "string" } },
      required: ["deployment_id"],
    },
  },
  {
    name: "graph_get_deployment_events",
    description: "Market Portal: deployment events.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: {
        deployment_id: { type: "string" },
        limit: { type: "string" },
      },
      required: ["deployment_id"],
    },
  },
  {
    name: "graph_get_deployment_logs",
    description: "Market Portal: deployment logs tail.",
    category: "market",
    requiresMarketBearer: true,
    parameters: {
      type: "object",
      properties: {
        deployment_id: { type: "string" },
        tail_lines: { type: "string" },
      },
      required: ["deployment_id"],
    },
  },
  {
    name: "graph_whoami",
    description: "Graphitti: authenticated user when GRAPHITTI_API_KEY is set.",
    category: "graphitti",
    requiresGraphittiKey: true,
    parameters: { type: "object", properties: {} },
  },
  {
    name: "graph_search_workflows",
    description: "Graphitti: search listed workflows (default category the-graph).",
    category: "graphitti",
    parameters: {
      type: "object",
      properties: { q: keywordProp, category: { type: "string" }, limit: { type: "number" } },
    },
  },
  {
    name: "graph_get_listing",
    description: "Graphitti: get marketplace listing metadata by slug.",
    category: "graphitti",
    parameters: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "graph_call_workflow",
    description: "Graphitti: execute a listed workflow by slug (402 if unpaid).",
    category: "graphitti",
    optional: true,
    parameters: {
      type: "object",
      properties: { slug: { type: "string" }, input: { type: "object" } },
      required: ["slug"],
    },
  },
  {
    name: "graph_execute_workflow",
    description: "Graphitti: execute an owned workflow by id (requires API key).",
    category: "graphitti",
    optional: true,
    requiresGraphittiKey: true,
    parameters: {
      type: "object",
      properties: { workflow_id: { type: "string" }, input: { type: "object" } },
      required: ["workflow_id"],
    },
  },
  {
    name: "graph_get_execution",
    description: "Graphitti: poll workflow execution status.",
    category: "graphitti",
    requiresGraphittiKey: true,
    parameters: {
      type: "object",
      properties: { execution_id: { type: "string" } },
      required: ["execution_id"],
    },
  },
];

export function getToolDefinition(name: string): GraphToolDefinition | undefined {
  return GRAPH_TOOLS.find((tool) => tool.name === name);
}

export function listAvailableTools(credentials: GraphCredentials): GraphToolDefinition[] {
  return GRAPH_TOOLS.filter((tool) => {
    if (tool.requiresGraphittiKey && !credentials.GRAPHITTI_API_KEY?.trim()) {
      return false;
    }
    if (tool.requiresMarketBearer && !credentials.THEGRAPH_MARKET_BEARER?.trim()) {
      return false;
    }
    return true;
  });
}
