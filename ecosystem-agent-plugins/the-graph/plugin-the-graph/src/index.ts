import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  Plugin,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  executeGraphTool,
  GRAPH_TOOLS,
  resolveCredentials,
  type GraphCredentials,
} from "@graphitti/graph-core";
import { parseToolParamsFromMessage } from "./parse-tool-params.js";

function envCredentials(runtime: IAgentRuntime): GraphCredentials {
  const base = resolveCredentials();
  return {
    ...base,
    THEGRAPH_API_KEY:
      runtime.getSetting("THEGRAPH_API_KEY") ?? base.THEGRAPH_API_KEY,
    SUBSTREAMS_API_KEY:
      runtime.getSetting("SUBSTREAMS_API_KEY") ?? base.SUBSTREAMS_API_KEY,
    THEGRAPH_MARKET_BEARER:
      runtime.getSetting("THEGRAPH_MARKET_BEARER") ??
      base.THEGRAPH_MARKET_BEARER,
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
  const actionName = toActionName(toolName);
  return {
    name: actionName,
    similes: [toolName, toolName.replace(/^graph_/, "")],
    description,
    examples: [],
    validate: async (runtime) => {
      const creds = envCredentials(runtime);
      if (!creds.THEGRAPH_API_KEY && toolName === "graph_whoami") {
        return Boolean(creds.GRAPHITTI_API_KEY);
      }
      return Boolean(creds.THEGRAPH_API_KEY);
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      _state?: State,
      _options?: Record<string, unknown>,
      callback?: HandlerCallback
    ): Promise<ActionResult> => {
      const creds = envCredentials(runtime);
      const params = parseToolParamsFromMessage(message, [
        "goal",
        "keyword",
        "query",
      ]);
      const result = await executeGraphTool(toolName, params, creds);
      if (!result.success) {
        const errorText = result.error;
        await callback?.({
          text: errorText,
          source: message.content.source,
          actions: [actionName],
        });
        return { success: false, text: errorText, error: errorText };
      }
      const text = JSON.stringify(result.data);
      await callback?.({
        text,
        source: message.content.source,
        actions: [actionName],
      });
      return {
        success: true,
        text,
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
    if (!creds.THEGRAPH_API_KEY && !creds.GRAPHITTI_API_KEY) {
      logger.warn(
        "[plugin-the-graph] THEGRAPH_API_KEY (or GRAPHITTI_API_KEY for whoami) is not set; graph actions will not validate until configured."
      );
    }
  },
};

export default theGraphPlugin;
export { theGraphPlugin as plugin };
