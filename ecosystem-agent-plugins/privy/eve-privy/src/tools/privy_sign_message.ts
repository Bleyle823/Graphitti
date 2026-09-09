import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_sign_message",
  description: "Sign a message with a Privy wallet.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "message": {
      "type": "string"
    },
    "network": {
      "type": "string",
      "description": "Network (ethereum, base, base_sepolia, ...)"
    }
  },
  "required": [
    "wallet_id",
    "message"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_sign_message",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
