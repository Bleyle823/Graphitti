import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_whoami",
  description: "Graphitti: authenticated user when GRAPHITTI_API_KEY is set.",
  inputSchema: {
  "type": "object",
  "properties": {}
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_whoami",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
