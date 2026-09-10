import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_get_key_quorum",
  description: "Fetch a Privy key quorum by ID.",
  inputSchema: {
  "type": "object",
  "properties": {
    "quorum_id": {
      "type": "string"
    }
  },
  "required": [
    "quorum_id"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_key_quorum",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
