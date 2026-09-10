import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_get_balance",
  description: "Read wallet balance from Privy.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "asset": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_balance",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
