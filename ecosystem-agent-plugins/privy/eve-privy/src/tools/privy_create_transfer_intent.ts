import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_create_transfer_intent",
  description: "Propose a transfer intent for owner quorum approval.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "source_chain": {
      "type": "string"
    },
    "source_asset": {
      "type": "string"
    },
    "amount": {
      "type": "string"
    },
    "destination_address": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "amount",
    "destination_address",
    "source_chain",
    "source_asset"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_transfer_intent",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
