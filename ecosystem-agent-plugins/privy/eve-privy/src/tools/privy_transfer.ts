import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_transfer",
  description: "Transfer native tokens with Privy gas sponsorship.",
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
    "amount": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "to",
    "amount"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_transfer",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
