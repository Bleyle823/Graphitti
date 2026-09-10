import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_get_user",
  description: "Fetch a Privy user by ID from api.privy.io.",
  inputSchema: {
  "type": "object",
  "properties": {
    "privy_user_id": {
      "type": "string"
    }
  },
  "required": [
    "privy_user_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_user",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
