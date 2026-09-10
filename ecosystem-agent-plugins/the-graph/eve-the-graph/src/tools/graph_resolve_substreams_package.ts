import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_resolve_substreams_package",
  description: "Registry lookup plus deploy checklist and endpoint (setup only).",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    },
    "version": {
      "type": "string"
    },
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    }
  },
  "required": [
    "slug"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_resolve_substreams_package",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
