import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_add_payee",
  description: "Graphitti B2B: add an org treasury payee.",
  inputSchema: {
  "type": "object",
  "properties": {
    "label": {
      "type": "string"
    },
    "address": {
      "type": "string"
    },
    "default_amount_usdc": {
      "type": "string"
    },
    "chain": {
      "type": "string"
    }
  },
  "required": [
    "label",
    "address"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_add_payee",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
