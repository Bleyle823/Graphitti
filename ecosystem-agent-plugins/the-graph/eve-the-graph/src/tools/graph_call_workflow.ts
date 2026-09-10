import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_call_workflow",
  description: "Graphitti: execute a listed workflow by slug (402 if unpaid).",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    },
    "input": {
      "type": "object"
    }
  },
  "required": [
    "slug"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executeGraphTool(
      "graph_call_workflow",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
