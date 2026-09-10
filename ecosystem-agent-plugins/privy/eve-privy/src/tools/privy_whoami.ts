import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_whoami",
  description: "Graphitti B2B: authenticated user and org when GRAPHITTI_API_KEY is set.",
  inputSchema: {
  "type": "object",
  "properties": {}
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_whoami",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
