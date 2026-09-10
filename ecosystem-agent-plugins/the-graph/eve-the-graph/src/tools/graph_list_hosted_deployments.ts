import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: "graph_list_hosted_deployments",
  description: "Market Portal: list hosted Substreams deployments.",
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
      "graph_list_hosted_deployments",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
