import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_execute_workflow",
  description: "Graphitti: execute an owned workflow by id (requires API key).",
  inputSchema: {
  "type": "object",
  "properties": {
    "workflow_id": {
      "type": "string"
    },
    "input": {
      "type": "object"
    }
  },
  "required": [
    "workflow_id"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executeGraphTool(
      "graph_execute_workflow",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
