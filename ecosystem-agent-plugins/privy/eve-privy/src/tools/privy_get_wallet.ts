import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_get_wallet",
  description: "Fetch a Privy wallet by wallet ID (native REST).",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    }
  },
  "required": [
    "wallet_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_wallet",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
