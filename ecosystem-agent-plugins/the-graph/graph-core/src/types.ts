export type GraphCredentials = {
  THEGRAPH_API_KEY?: string;
  SUBSTREAMS_API_KEY?: string;
  THEGRAPH_MARKET_BEARER?: string;
  GRAPHITTI_BASE_URL?: string;
  GRAPHITTI_API_KEY?: string;
};

export type ToolResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export type GraphToolDefinition = {
  name: string;
  description: string;
  category: "discovery" | "query" | "token" | "market" | "substreams" | "graphitti";
  optional?: boolean;
  requiresSubstreamsKey?: boolean;
  requiresMarketBearer?: boolean;
  requiresGraphittiKey?: boolean;
  parameters: Record<string, unknown>;
};

export type ExecuteParams = Record<string, unknown>;
