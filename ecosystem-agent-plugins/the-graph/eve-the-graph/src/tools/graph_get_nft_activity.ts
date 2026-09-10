import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_get_nft_activity",
  description: "Token API: NFT transfer activity for a contract.",
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
      "graph_get_nft_activity",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
