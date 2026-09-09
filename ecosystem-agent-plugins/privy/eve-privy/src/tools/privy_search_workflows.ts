import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_search_workflows",
  description: "Graphitti B2B: search listed workflows (default category privy).",
  inputSchema: {
  "type": "object",
  "properties": {
    "q": {
      "type": "string"
    },
    "category": {
      "type": "string"
    }
  }
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_search_workflows",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
