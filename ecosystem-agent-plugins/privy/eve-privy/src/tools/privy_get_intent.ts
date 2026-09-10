import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_get_intent",
  description: "Fetch Privy intent status from api.privy.io.",
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
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_intent",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
