import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_search_workflows",
  description: "Graphitti: search listed workflows (default category the-graph).",
  inputSchema: {
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "description": "Search keyword"
    },
    "category": {
      "type": "string"
    },
    "limit": {
      "type": "number"
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_search_workflows",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
