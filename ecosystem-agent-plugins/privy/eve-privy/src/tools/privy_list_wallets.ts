import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_list_wallets",
  description: "List server wallets in the Privy app.",
  inputSchema: {
  "type": "object",
  "properties": {}
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_list_wallets",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
