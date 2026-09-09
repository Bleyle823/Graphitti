import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_get_substreams_stream_status",
  description: "Check subgraph _meta sync for a Substreams-backed deployment.",
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
      "graph_get_substreams_stream_status",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
