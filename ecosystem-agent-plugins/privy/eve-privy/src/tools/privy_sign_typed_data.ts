import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_sign_typed_data",
  description: "Sign EIP-712 typed data with a Privy wallet.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "typed_data": {
      "type": "string"
    },
    "network": {
      "type": "string",
      "description": "Network (ethereum, base, base_sepolia, ...)"
    }
  },
  "required": [
    "wallet_id",
    "typed_data"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_sign_typed_data",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
