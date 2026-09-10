import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_search_substreams_packages",
  description: "Search substreams.dev package registry.",
  inputSchema: {
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search keyword"
    },
    "organization": {
      "type": "string"
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_search_substreams_packages",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
