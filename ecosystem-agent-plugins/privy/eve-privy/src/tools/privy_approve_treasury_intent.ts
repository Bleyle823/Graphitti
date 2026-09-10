import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_approve_treasury_intent",
  description: "Graphitti B2B: approve and sign an org treasury intent.",
  inputSchema: {
  "type": "object",
  "properties": {
    "intent_id": {
      "type": "string"
    }
  },
  "required": [
    "intent_id"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_approve_treasury_intent",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
