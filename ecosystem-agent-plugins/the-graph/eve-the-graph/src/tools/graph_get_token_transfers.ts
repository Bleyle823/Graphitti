import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_get_token_transfers",
  description: "Token API: EVM transfers for an address.",
  inputSchema: {
  "type": "object",
  "properties": {
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    },
    "address": {
      "type": "string"
    },
    "start_time": {
      "type": "string"
    },
    "end_time": {
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
      "graph_get_token_transfers",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
