import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_indexing_status",
  description: "Read _meta block and deployment sync status for a subgraph.",
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
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_indexing_status",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
