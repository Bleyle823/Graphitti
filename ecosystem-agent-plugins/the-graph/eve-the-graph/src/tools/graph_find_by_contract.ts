import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

export default defineTool({
  name: "graph_find_by_contract",
  description: "Find top subgraph deployments for a contract address and chain. Uses mainnet not ethereum for Ethereum.",
  inputSchema: {
  "type": "object",
  "properties": {
    "contract_address": {
      "type": "string"
    },
    "chain": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    }
  },
  "required": [
    "contract_address",
    "chain"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_find_by_contract",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
