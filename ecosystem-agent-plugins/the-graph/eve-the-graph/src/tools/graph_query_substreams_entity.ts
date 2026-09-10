import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@bleyle823/graph-core";

export default defineTool({
  name: "graph_query_substreams_entity",
  description: "Query indexed Substreams graph_out entities via subgraph GraphQL. Does not start gRPC.",
  inputSchema: {
  "type": "object",
  "properties": {
    "subgraph_id": {
      "type": "string",
      "description": "Subgraph id from Explorer"
    },
    "entity_name": {
      "type": "string"
    },
    "where_json": {
      "type": "string"
    },
    "first": {
      "type": "number"
    }
  },
  "required": [
    "subgraph_id",
    "entity_name"
  ]
},
  async execute(input) {
    const result = await executeGraphTool(
      "graph_query_substreams_entity",
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
