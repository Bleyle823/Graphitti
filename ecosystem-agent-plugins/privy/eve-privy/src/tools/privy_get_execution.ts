import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_get_execution",
  description: "Graphitti B2B: poll workflow execution status.",
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
    const result = await executePrivyTool(
      "privy_get_execution",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
