import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_send_transaction",
  description: "Send a gas-sponsored transaction from a Privy wallet.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "network": {
      "type": "string",
      "description": "Network (ethereum, base, base_sepolia, ...)"
    },
    "to": {
      "type": "string"
    },
    "data": {
      "type": "string"
    },
    "value": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "to"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_send_transaction",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
