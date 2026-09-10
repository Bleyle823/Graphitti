import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_get_wallet_by_address",
  description: "Find Privy wallets by onchain address.",
  inputSchema: {
  "type": "object",
  "properties": {
    "address": {
      "type": "string"
    }
  },
  "required": [
    "address"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_wallet_by_address",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
