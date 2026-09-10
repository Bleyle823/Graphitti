import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_get_substreams_package",
  description: "Resolve Substreams package slug to spkg URL and version.",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    },
    "version": {
      "type": "string"
    }
  },
  "required": [
    "slug"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_substreams_package",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
