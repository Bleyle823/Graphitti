import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_substreams_webhook_setup",
  description: "Return substreams sink webhook CLI command and Graphitti webhook URL template.",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    },
    "version": {
      "type": "string"
    },
    "module_name": {
      "type": "string"
    },
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    },
    "workflow_id": {
      "type": "string"
    },
    "base_url": {
      "type": "string"
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_substreams_webhook_setup",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
