import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_get_treasury",
  description: "Graphitti B2B: org treasury wallet, payees, and recent intents. Not the same as privy_get_wallet.",
  inputSchema: {
  "type": "object",
  "properties": {}
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_get_treasury",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
