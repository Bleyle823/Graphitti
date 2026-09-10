import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_create_treasury_intent",
  description: "Graphitti B2B: create an org treasury payment intent.",
  inputSchema: {
  "type": "object",
  "properties": {
    "amount_usdc": {
      "type": "string"
    },
    "to_address": {
      "type": "string"
    },
    "payee_id": {
      "type": "string"
    }
  },
  "required": [
    "amount_usdc",
    "to_address"
  ]
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_treasury_intent",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
