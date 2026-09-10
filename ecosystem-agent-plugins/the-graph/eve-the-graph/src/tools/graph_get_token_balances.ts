import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_get_token_balances",
  description: "Token API: EVM balances for an address.",
  inputSchema: {
  "type": "object",
  "properties": {
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    },
    "address": {
      "type": "string"
    }
  },
  "required": [
    "network",
    "address"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_token_balances",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
