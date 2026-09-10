import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_get_listing",
  description: "Graphitti: get marketplace listing metadata by slug.",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    }
  },
  "required": [
    "slug"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_listing",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
