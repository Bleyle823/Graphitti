import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_deployment_logs",
  description: "Market Portal: deployment logs tail.",
  inputSchema: {
  "type": "object",
  "properties": {
    "deployment_id": {
      "type": "string"
    },
    "tail_lines": {
      "type": "string"
    }
  },
  "required": [
    "deployment_id"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_deployment_logs",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
