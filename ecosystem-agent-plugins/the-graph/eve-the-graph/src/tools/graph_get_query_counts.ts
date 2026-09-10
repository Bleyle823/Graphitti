import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_query_counts",
  description: "Get 30-day query volume (queryFeesAmount) for deployment IPFS hashes. NON-OPTIONAL before selecting a subgraph.",
  inputSchema: {
  "type": "object",
  "properties": {
    "ipfs_hashes": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Qm… IPFS hashes from search results"
    }
  },
  "required": [
    "ipfs_hashes"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_query_counts",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
