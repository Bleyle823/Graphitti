import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_dex_swaps",
  description: "Token API: DEX swaps on a network, optionally filtered by pool.",
  inputSchema: {
  "type": "object",
  "properties": {
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    },
    "pool": {
      "type": "string"
    }
  },
  "required": [
    "network"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_dex_swaps",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
