import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@graphitti/privy-core";

export default defineTool({
  name: "privy_list_payees",
  description: "Graphitti B2B: list org treasury payees.",
  inputSchema: {
  "type": "object",
  "properties": {}
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_list_payees",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
