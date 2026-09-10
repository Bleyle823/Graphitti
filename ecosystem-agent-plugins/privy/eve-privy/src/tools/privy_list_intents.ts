import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_list_intents",
  description: "List Privy intents, optionally filtered by wallet.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    }
  }
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_list_intents",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
