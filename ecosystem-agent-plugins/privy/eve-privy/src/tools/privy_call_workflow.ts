import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_call_workflow",
  description: "Graphitti B2B: execute a listed payroll/treasury workflow by slug (402 if unpaid).",
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
    const result = await executePrivyTool(
      "privy_call_workflow",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
