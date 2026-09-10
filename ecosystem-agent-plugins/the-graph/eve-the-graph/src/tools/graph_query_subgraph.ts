import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_query_subgraph",
  description: "Execute GraphQL against a subgraph via Gateway (Bearer THEGRAPH_API_KEY). Never auto-pay x402.",
  inputSchema: {
  "type": "object",
  "properties": {
    "subgraph_id": {
      "type": "string",
      "description": "Subgraph id from Explorer"
    },
    "deployment_id": {
      "type": "string"
    },
    "ipfs_hash": {
      "type": "string"
    },
    "query": {
      "type": "string"
    },
    "variables": {
      "type": "object"
    }
  },
  "required": [
    "query"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_query_subgraph",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
