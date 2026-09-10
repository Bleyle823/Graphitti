import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_active_connections",
  description: "Market Portal: active connections.",
  inputSchema: {
  "type": "object",
  "properties": {
    "organization_id": {
      "type": "string"
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_active_connections",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
