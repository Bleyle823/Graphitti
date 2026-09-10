import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_get_deployment_events",
  description: "Market Portal: deployment events.",
  inputSchema: {
  "type": "object",
  "properties": {
    "deployment_id": {
      "type": "string"
    },
    "limit": {
      "type": "string"
    }
  },
  "required": [
    "deployment_id"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_deployment_events",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
