import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_subgraph_detail",
  description: "Fetch subgraph metadata, deployment, and query URLs.",
  inputSchema: {
  "type": "object",
  "properties": {
    "subgraph_id": {
      "type": "string",
      "description": "Subgraph id from Explorer"
    }
  },
  "required": [
    "subgraph_id"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_subgraph_detail",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
