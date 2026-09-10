import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_get_policy",
  description: "Fetch a Privy policy by ID.",
  inputSchema: {
  "type": "object",
  "properties": {
    "policy_id": {
      "type": "string"
    }
  },
  "required": [
    "policy_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_policy",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
