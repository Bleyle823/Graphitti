import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@bleyle823/privy-core";

export default defineTool({
  name: "privy_create_rpc_intent",
  description: "Create an RPC intent for quorum approval.",
  inputSchema: {
  "type": "object",
  "properties": {
    "wallet_id": {
      "type": "string",
      "description": "Privy wallet ID (wallet_...)"
    },
    "rpc_body": {
      "type": "string"
    }
  },
  "required": [
    "wallet_id",
    "rpc_body"
  ]
},
  async execute(input) {
    const result = await executePrivyTool(
      "privy_create_rpc_intent",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
