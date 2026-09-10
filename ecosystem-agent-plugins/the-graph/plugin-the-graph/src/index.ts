import type { Action, IAgentRuntime, Memory, Plugin } from "@elizaos/core";
import {
  executeGraphTool,
  GRAPH_TOOLS,
  resolveCredentials,
  type GraphCredentials,
} from "@graphitti/graph-core";

function envCredentials(runtime: IAgentRuntime): GraphCredentials {
  const base = resolveCredentials();
  return {
    ...base,
    THEGRAPH_API_KEY:
      runtime.getSetting("THEGRAPH_API_KEY") ?? base.THEGRAPH_API_KEY,
    SUBSTREAMS_API_KEY:
      runtime.getSetting("SUBSTREAMS_API_KEY") ?? base.SUBSTREAMS_API_KEY,
    THEGRAPH_MARKET_BEARER:
      runtime.getSetting("THEGRAPH_MARKET_BEARER") ?? base.THEGRAPH_MARKET_BEARER,
    GRAPHITTI_BASE_URL:
      runtime.getSetting("GRAPHITTI_BASE_URL") ?? base.GRAPHITTI_BASE_URL,
    GRAPHITTI_API_KEY:
      runtime.getSetting("GRAPHITTI_API_KEY") ?? base.GRAPHITTI_API_KEY,
  };
}

function toActionName(toolName: string): string {
  return toolName.toUpperCase();
}

function createGraphAction(toolName: string, description: string): Action {
  return {
    name: toActionName(toolName),
    similes: [toolName, toolName.replace(/^graph_/, "")],
    description,
    examples: [],
    validate: async (runtime) => {
      const creds = envCredentials(runtime);
      if (!creds.THEGRAPH_API_KEY && toolName.startsWith("graph_whoami")) {
        return Boolean(creds.GRAPHITTI_API_KEY);
      }
      return Boolean(creds.THEGRAPH_API_KEY);
    },
    handler: async (runtime, message) => {
      const creds = envCredentials(runtime);
      const text = message.content.text ?? "";
      let params: Record<string, unknown> = {};
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          params = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        } catch {
          params = { goal: text, keyword: text, query: text };
        }
      } else if (text.trim()) {
        params = { goal: text, keyword: text, query: text };
      }
      const result = await executeGraphTool(toolName, params, creds);
      if (!result.success) {
        return { success: false, text: result.error, error: new Error(result.error) };
      }
      return {
        success: true,
        text: JSON.stringify(result.data),
        data: result.data,
      };
    },
  };
}

const actions: Action[] = GRAPH_TOOLS.map((tool) =>
  createGraphAction(tool.name, tool.description)
);

export const theGraphPlugin: Plugin = {
  name: "the-graph",
  description:
    "The Graph protocol plugin: subgraph discovery, GraphQL, Token API, Substreams, and Graphitti workflows.",
  actions,
  providers: [],
  services: [],
  init: async (_config, runtime) => {
    const creds = envCredentials(runtime);
    if (!creds.THEGRAPH_API_KEY) {
      throw new Error("THEGRAPH_API_KEY is required for plugin-the-graph");
    }
  },
};

export default theGraphPlugin;
export { theGraphPlugin as plugin };
