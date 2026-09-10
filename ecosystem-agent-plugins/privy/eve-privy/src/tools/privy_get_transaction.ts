import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_get_transaction",
  description: "Fetch a Privy wallet transaction by ID.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "transaction_id": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "transaction_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_transaction",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
