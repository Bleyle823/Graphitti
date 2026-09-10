import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_create_policy",
  description: "Create a Privy authorization policy.",
  inputSchema: {
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "rules_json": {
      "type": "string"
    },
    "owner_id": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "rules_json"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_policy",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
