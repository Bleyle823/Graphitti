import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_query_lending_snapshot",
  description: "Messari-shaped lending protocol and market snapshot query.",
  inputSchema: {
  "type": "object",
  "properties": {
    "subgraph_id": {
      "type": "string",
      "description": "Subgraph id from Explorer"
    },
    "protocol": {
      "type": "string"
    }
  },
  "required": [
    "subgraph_id"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_query_lending_snapshot",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
