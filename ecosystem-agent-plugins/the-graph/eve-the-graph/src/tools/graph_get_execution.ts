import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_execution",
  description: "Graphitti: poll workflow execution status.",
  inputSchema: {
  "type": "object",
  "properties": {
    "execution_id": {
      "type": "string"
    }
  },
  "required": [
    "execution_id"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_execution",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
