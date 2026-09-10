import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: "privy_create_wallet",
  description: "Create a new Privy server wallet.",
  inputSchema: {
  "type": "object",
  "properties": {
    "chain_type": {
      "type": "string"
    }
  }
},
  approval: { type: "user" },
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_wallet",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
