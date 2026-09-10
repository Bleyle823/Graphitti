import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_recommend_subgraph",
  description: "Search subgraphs for a goal and return ranked candidates with 30-day query counts attached.",
  inputSchema: {
  "type": "object",
  "properties": {
    "goal": {
      "type": "string",
      "description": "Search keyword"
    },
    "network": {
      "type": "string",
      "description": "Network (mainnet, base, arbitrum-one, …)"
    }
  },
  "required": [
    "goal"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_recommend_subgraph",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
