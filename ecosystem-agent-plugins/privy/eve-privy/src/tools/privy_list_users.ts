import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_list_users",
  description: "Search Privy users by email or identifier.",
  inputSchema: {
  "type": "object",
  "properties": {
    "query": {
      "type": "string"
    }
  },
  "required": [
    "query"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_list_users",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
