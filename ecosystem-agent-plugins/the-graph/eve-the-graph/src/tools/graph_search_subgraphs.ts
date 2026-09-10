import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_search_subgraphs",
  description: "Search The Graph Network by keyword. Follow with graph_get_query_counts or graph_recommend_subgraph before querying.",
  inputSchema: {
  "type": "object",
  "properties": {
    "keyword": {
      "type": "string",
      "description": "Search keyword"
    },
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    }
  },
  "required": [
    "keyword"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_search_subgraphs",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
