import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_execute_workflow",
  description: "Graphitti B2B: execute an owned workflow by id.",
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
    const result = await executePrivyTool(
      "privy_execute_workflow",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
