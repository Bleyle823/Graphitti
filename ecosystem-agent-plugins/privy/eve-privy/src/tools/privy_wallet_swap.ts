import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_wallet_swap",
  description: "Swap assets via Privy wallet actions API.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "chain": {
      "type": "string"
    },
    "from_asset": {
      "type": "string"
    },
    "to_asset": {
      "type": "string"
    },
    "amount": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "from_asset",
    "to_asset",
    "amount"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_wallet_swap",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
