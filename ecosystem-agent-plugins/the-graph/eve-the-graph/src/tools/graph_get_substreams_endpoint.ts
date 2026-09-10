import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_get_substreams_endpoint",
  description: "Map network to default StreamingFast gRPC endpoint.",
  inputSchema: {
  "type": "object",
  "properties": {
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    }
  },
  "required": [
    "network"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_substreams_endpoint",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
