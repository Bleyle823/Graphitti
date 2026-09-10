import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_substreams_run",
  description: "Optional bounded Substreams gRPC run (v1 returns guidance; use entity query or external sink).",
  inputSchema: {
  "type": "object",
  "properties": {
    "slug": {
      "type": "string"
    },
    "module": {
      "type": "string"
    },
    "max_messages": {
      "type": "number"
    }
  },
  "required": [
    "slug",
    "module"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executeGraphTool(
      "graph_substreams_run",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
