import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_get_bill_preview",
  description: "Market Portal: bill preview.",
  inputSchema: {
  "type": "object",
  "properties": {
    "organization_id": {
      "type": "string"
    }
  }
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_get_bill_preview",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
