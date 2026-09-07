import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";

const graphNetworkOptions = [
  { value: "", label: "Any network" },
  { value: "mainnet", label: "Ethereum (mainnet)" },
  { value: "base", label: "Base" },
  { value: "arbitrum-one", label: "Arbitrum One" },
  { value: "optimism", label: "Optimism" },
  { value: "matic", label: "Polygon" },
  { value: "bsc", label: "BNB Smart Chain" },
  { value: "avalanche", label: "Avalanche" },
];

const tokenNetworkOptions = [
  { value: "mainnet", label: "Ethereum (mainnet)" },
  { value: "base", label: "Base" },
  { value: "arbitrum-one", label: "Arbitrum One" },
  { value: "optimism", label: "Optimism" },
  { value: "matic", label: "Polygon" },
  { value: "bsc", label: "BNB Smart Chain" },
  { value: "avalanche", label: "Avalanche" },
];

const substreamsNetworkOptions = [
  { value: "ethereum", label: "Ethereum" },
  { value: "base", label: "Base" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "polygon", label: "Polygon" },
  { value: "solana", label: "Solana" },
];

const subgraphIdFields = [
  {
    key: "id",
    label: "Subgraph id",
    type: "template-input" as const,
    placeholder: "Subgraph id from Explorer",
    example: "DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp",
  },
  {
    type: "group" as const,
    label: "Or route by deployment / IPFS",
    fields: [
      {
        key: "deploymentId",
        label: "Deployment id",
        type: "template-input" as const,
        placeholder: "0x… 32-byte deployment id",
      },
      {
        key: "ipfsHash",
        label: "IPFS hash",
        type: "template-input" as const,
        placeholder: "Qm…",
      },
    ],
  },
];

const organizationField = {
  key: "organizationId",
  label: "Organization id",
  type: "template-input" as const,
  placeholder: "Portal organization_id",
  required: true,
};

const queryUrlOutputs = [
  { field: "query_url", description: "Gateway query URL (Bearer auth, never x402)" },
  { field: "query_url_x402", description: "x402 URL for display only — never auto-pay" },
];

const theGraphPlugin: IntegrationPlugin = {
  type: "the-graph",
  label: "The Graph",
  description:
    "Discover and query subgraphs, Token API, Substreams packages, and Market reads. Never auto-pays x402.",
  formFields: [
    {
      id: "apiKey",
      label: "Studio / Gateway API Key",
      type: "password",
      placeholder: "Gateway or Studio key",
      configKey: "apiKey",
      envVar: "THEGRAPH_API_KEY",
      helpText: "Used for subgraph GraphQL, schema, and Token API. Get a key from ",
      helpLink: {
        text: "thegraph.com/studio",
        url: "https://thegraph.com/studio",
      },
    },
    {
      id: "substreamsApiKey",
      label: "Substreams API Key",
      type: "password",
      placeholder: "Data-plane key (optional)",
      configKey: "substreamsApiKey",
      envVar: "SUBSTREAMS_API_KEY",
      helpText: "Separate from the Studio/gateway key. Used for gated package registry requests.",
    },
    {
      id: "marketBearer",
      label: "Market / Portal Bearer",
      type: "password",
      placeholder: "Portal access token",
      configKey: "marketBearer",
      envVar: "THEGRAPH_MARKET_BEARER",
      helpText: "Optional. Required for billing, usage, and hosted-sink reads.",
    },
  ],
  testConfig: {
    getTestFunction: async () => {
      const { testTheGraph } = await import("./test");
      return testTheGraph;
    },
  },
  actions: [
    {
      slug: "search-subgraphs",
      label: "Search subgraphs",
      description: "Keyword search on The Graph Network meta-subgraph",
      category: "The Graph Discovery",
      stepFunction: "searchSubgraphsStep",
      stepImportPath: "discovery",
      outputFields: [
        { field: "subgraphs", description: "Matching subgraphs" },
        { field: "count", description: "Result count" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "keyword",
          label: "Keyword",
          type: "template-input",
          placeholder: "uniswap or aave",
          example: "uniswap",
          required: true,
        },
        {
          key: "network",
          label: "Network",
          type: "select",
          options: graphNetworkOptions,
          defaultValue: "",
        },
      ],
    },
    {
      slug: "recommend-subgraph",
      label: "Recommend subgraph",
      description: "Rank subgraphs for a natural-language goal",
      category: "The Graph Discovery",
      stepFunction: "recommendSubgraphStep",
      stepImportPath: "discovery",
      outputFields: [
        { field: "subgraphs", description: "Ranked subgraphs" },
        { field: "count", description: "Result count" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "goal",
          label: "Goal",
          type: "template-textarea",
          placeholder: "What data do you need?",
          example: "Uniswap v3 swaps on Ethereum",
          required: true,
          rows: 3,
        },
      ],
    },
    {
      slug: "get-subgraph-detail",
      label: "Get subgraph detail",
      description: "Metadata, deployment, and query URLs for a subgraph id",
      category: "The Graph Discovery",
      stepFunction: "getSubgraphDetailStep",
      stepImportPath: "discovery",
      outputFields: [
        { field: "id", description: "Subgraph id" },
        { field: "deploymentId", description: "Current deployment id" },
        { field: "displayName", description: "Display name" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "id",
          label: "Subgraph id",
          type: "template-input",
          required: true,
        },
      ],
    },
    {
      slug: "get-schema",
      label: "Get schema",
      description: "Introspect entity types. Discovery never introspects unless you run this.",
      category: "The Graph Discovery",
      stepFunction: "getSchemaStep",
      stepImportPath: "discovery",
      outputFields: [
        { field: "types", description: "Entity types and fields" },
        { field: "count", description: "Type count" },
        ...queryUrlOutputs,
      ],
      configFields: subgraphIdFields,
    },
    {
      slug: "find-by-contract",
      label: "Find subgraphs by contract",
      description: "Look up subgraphs that mention a contract on a chain",
      category: "The Graph Discovery",
      stepFunction: "findByContractStep",
      stepImportPath: "discovery",
      outputFields: [
        { field: "subgraphs", description: "Matching subgraphs" },
        { field: "count", description: "Result count" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "contract",
          label: "Contract",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
        {
          key: "chain",
          label: "Chain",
          type: "select",
          options: graphNetworkOptions.filter((option) => option.value),
          defaultValue: "mainnet",
          required: true,
        },
      ],
    },
    {
      slug: "query-subgraph",
      label: "Query subgraph",
      description: "POST GraphQL to the gateway. Cap first. Never pays x402.",
      category: "The Graph Query",
      stepFunction: "querySubgraphStep",
      stepImportPath: "query",
      outputFields: [
        { field: "data", description: "GraphQL data" },
        { field: "errors", description: "GraphQL errors" },
        { field: "httpStatus", description: "HTTP status" },
        ...queryUrlOutputs,
      ],
      configFields: [
        ...subgraphIdFields,
        {
          key: "query",
          label: "GraphQL query",
          type: "template-textarea",
          placeholder: "{ _meta { block { number } } }",
          example: "{ _meta { block { number hash } } }",
          required: true,
          rows: 8,
        },
        {
          type: "group",
          label: "Variables",
          fields: [
            {
              key: "variables",
              label: "Variables JSON",
              type: "template-textarea",
              placeholder: '{ "first": 20 }',
              rows: 4,
            },
            {
              key: "operationName",
              label: "Operation name",
              type: "template-input",
            },
          ],
        },
      ],
    },
    {
      slug: "get-indexing-status",
      label: "Get indexing status",
      description: "Read _meta block number, hash, and deployment",
      category: "The Graph Query",
      stepFunction: "getIndexingStatusStep",
      stepImportPath: "query",
      outputFields: [
        { field: "meta", description: "_meta payload" },
        ...queryUrlOutputs,
      ],
      configFields: subgraphIdFields,
    },
    {
      slug: "query-lending-snapshot",
      label: "Query lending snapshot",
      description: "Messari-shaped protocols and markets against a subgraph you supply",
      category: "The Graph Query",
      stepFunction: "queryLendingSnapshotStep",
      stepImportPath: "query",
      outputFields: [
        { field: "snapshot", description: "Protocols and top markets" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "id",
          label: "Subgraph id",
          type: "template-input",
          required: true,
        },
        {
          key: "protocol",
          label: "Protocol (optional)",
          type: "template-input",
          placeholder: "aave-v3",
        },
      ],
    },
    {
      slug: "get-token-balances",
      label: "Get token balances",
      description: "Token API balances for an address",
      category: "The Graph Token API",
      stepFunction: "getTokenBalancesStep",
      stepImportPath: "token-api",
      outputFields: [
        { field: "result", description: "Token API payload" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: tokenNetworkOptions,
          defaultValue: "mainnet",
          required: true,
        },
        {
          key: "address",
          label: "Address",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
      ],
    },
    {
      slug: "get-token-transfers",
      label: "Get token transfers",
      description: "Token API transfers for an address",
      category: "The Graph Token API",
      stepFunction: "getTokenTransfersStep",
      stepImportPath: "token-api",
      outputFields: [
        { field: "result", description: "Token API payload" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: tokenNetworkOptions,
          defaultValue: "mainnet",
          required: true,
        },
        {
          key: "address",
          label: "Address",
          type: "template-input",
          required: true,
        },
        {
          type: "group",
          label: "Time window",
          fields: [
            {
              key: "startTime",
              label: "Start time",
              type: "template-input",
              placeholder: "UNIX seconds",
            },
            {
              key: "endTime",
              label: "End time",
              type: "template-input",
            },
            {
              key: "age",
              label: "Age (days)",
              type: "template-input",
              placeholder: "30",
            },
          ],
        },
      ],
    },
    {
      slug: "get-token-holders",
      label: "Get token holders",
      description: "Token API holders for a token",
      category: "The Graph Token API",
      stepFunction: "getTokenHoldersStep",
      stepImportPath: "token-api",
      outputFields: [
        { field: "result", description: "Token API payload" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: tokenNetworkOptions,
          defaultValue: "mainnet",
          required: true,
        },
        {
          key: "token",
          label: "Token",
          type: "template-input",
          placeholder: "0x...",
          required: true,
        },
      ],
    },
    {
      slug: "get-dex-swaps",
      label: "Get DEX swaps",
      description: "Token API swaps, optionally filtered by pool",
      category: "The Graph Token API",
      stepFunction: "getDexSwapsStep",
      stepImportPath: "token-api",
      outputFields: [
        { field: "result", description: "Token API payload" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: tokenNetworkOptions,
          defaultValue: "mainnet",
          required: true,
        },
        {
          key: "pool",
          label: "Pool (optional)",
          type: "template-input",
          placeholder: "0x...",
        },
      ],
    },
    {
      slug: "get-nft-activity",
      label: "Get NFT activity",
      description: "Token API NFT transfers for an address",
      category: "The Graph Token API",
      stepFunction: "getNftActivityStep",
      stepImportPath: "token-api",
      outputFields: [
        { field: "result", description: "Token API payload" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: tokenNetworkOptions,
          defaultValue: "mainnet",
          required: true,
        },
        {
          key: "address",
          label: "Address",
          type: "template-input",
          required: true,
        },
      ],
    },
    {
      slug: "search-substreams-packages",
      label: "Search Substreams packages",
      description: "HTTP registry search. Does not run WASM.",
      category: "The Graph Substreams",
      stepFunction: "searchSubstreamsPackagesStep",
      stepImportPath: "substreams",
      outputFields: [
        { field: "packages", description: "Registry packages" },
        { field: "hasMore", description: "More pages available" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "query",
          label: "Query",
          type: "template-input",
          placeholder: "ethereum-common",
        },
        {
          type: "group",
          label: "Filters",
          fields: [
            {
              key: "organization",
              label: "Organization",
              type: "template-input",
            },
            {
              key: "featured",
              label: "Featured",
              type: "template-input",
              placeholder: "true",
            },
            {
              key: "page",
              label: "Page",
              type: "template-input",
              placeholder: "1",
            },
          ],
        },
      ],
    },
    {
      slug: "get-package",
      label: "Get package",
      description: "Resolve slug to latestVersion, spkg, and reference URLs",
      category: "The Graph Substreams",
      stepFunction: "getPackageStep",
      stepImportPath: "substreams",
      outputFields: [
        { field: "spkg", description: "spkg.io package URL" },
        { field: "reference", description: "api.substreams.dev package URL" },
        { field: "version", description: "Resolved version" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "slug",
          label: "Slug",
          type: "template-input",
          placeholder: "ethereum-common",
          required: true,
        },
        {
          key: "version",
          label: "Version",
          type: "template-input",
          placeholder: "v0.3.3 (optional; uses latest if empty)",
        },
      ],
    },
    {
      slug: "get-default-endpoint",
      label: "Get default endpoint",
      description: "Map a network id to the StreamingFast Substreams endpoint",
      category: "The Graph Substreams",
      stepFunction: "getDefaultEndpointStep",
      stepImportPath: "substreams",
      outputFields: [
        { field: "endpoint", description: "gRPC endpoint host:port" },
        { field: "network", description: "Resolved network" },
        ...queryUrlOutputs,
      ],
      configFields: [
        {
          key: "network",
          label: "Network",
          type: "select",
          options: substreamsNetworkOptions,
          defaultValue: "ethereum",
          required: true,
        },
      ],
    },
    {
      slug: "get-subscription",
      label: "Get subscription",
      description: "Market plan, tier, and quotas",
      category: "The Graph Market",
      stepFunction: "getSubscriptionStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Subscription payload" },
        ...queryUrlOutputs,
      ],
      configFields: [organizationField],
    },
    {
      slug: "get-usage-summary",
      label: "Get usage summary",
      description: "Multi-service usage for the organization",
      category: "The Graph Market",
      stepFunction: "getUsageSummaryStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Usage summary" },
        ...queryUrlOutputs,
      ],
      configFields: [organizationField],
    },
    {
      slug: "get-bill-preview",
      label: "Get bill preview",
      description: "Projected usage billing",
      category: "The Graph Market",
      stepFunction: "getBillPreviewStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Billing preview" },
        ...queryUrlOutputs,
      ],
      configFields: [organizationField],
    },
    {
      slug: "get-active-connections",
      label: "Get active connections",
      description: "Active workers and requests",
      category: "The Graph Market",
      stepFunction: "getActiveConnectionsStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Active connections" },
        ...queryUrlOutputs,
      ],
      configFields: [organizationField],
    },
    {
      slug: "list-hosted-deployments",
      label: "List hosted deployments",
      description: "Hosted sink deployments for the organization",
      category: "The Graph Market",
      stepFunction: "listHostedDeploymentsStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Deployments list" },
        ...queryUrlOutputs,
      ],
      configFields: [organizationField],
    },
    {
      slug: "get-deployment-state",
      label: "Get deployment state",
      description: "Hosted deployment health and replica state",
      category: "The Graph Market",
      stepFunction: "getDeploymentStateStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Deployment state" },
        ...queryUrlOutputs,
      ],
      configFields: [
        organizationField,
        {
          key: "deploymentId",
          label: "Deployment id",
          type: "template-input",
          required: true,
        },
      ],
    },
    {
      slug: "get-deployment-events",
      label: "Get deployment events",
      description: "Recent hosted deployment events",
      category: "The Graph Market",
      stepFunction: "getDeploymentEventsStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Deployment events" },
        ...queryUrlOutputs,
      ],
      configFields: [
        organizationField,
        {
          key: "deploymentId",
          label: "Deployment id",
          type: "template-input",
          required: true,
        },
        {
          key: "limit",
          label: "Limit",
          type: "template-input",
          placeholder: "20",
          defaultValue: "20",
        },
      ],
    },
    {
      slug: "get-deployment-logs",
      label: "Get deployment logs",
      description: "Hosted deployment logs",
      category: "The Graph Market",
      stepFunction: "getDeploymentLogsStep",
      stepImportPath: "market",
      outputFields: [
        { field: "result", description: "Deployment logs" },
        ...queryUrlOutputs,
      ],
      configFields: [
        organizationField,
        {
          key: "deploymentId",
          label: "Deployment id",
          type: "template-input",
          required: true,
        },
        {
          key: "tailLines",
          label: "Tail lines",
          type: "template-input",
          placeholder: "200",
          defaultValue: "200",
        },
        {
          key: "previous",
          label: "Previous instance",
          type: "template-input",
          placeholder: "true",
        },
      ],
    },
  ],
};

registerIntegration(theGraphPlugin);
export default theGraphPlugin;
