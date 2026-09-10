import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_get_token_holders",
  description: "Token API: holders for a token contract.",
  inputSchema: {
  "type": "object",
  "properties": {
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    },
    "token": {
      "type": "string"
    }
  },
  "required": [
    "network",
    "token"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_token_holders",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
