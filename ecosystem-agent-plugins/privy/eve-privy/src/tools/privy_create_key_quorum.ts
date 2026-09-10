import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_create_key_quorum",
  description: "Create a Privy key quorum for org approvals.",
  inputSchema: {
  "type": "object",
  "properties": {
    "display_name": {
      "type": "string"
    },
    "authorization_threshold": {
      "type": "string"
    },
    "user_ids_json": {
      "type": "string"
    }
  },
  "required": [
    "display_name",
    "authorization_threshold"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_key_quorum",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
