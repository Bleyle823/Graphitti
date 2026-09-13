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
  executePrivyTool,
  PRIVY_TOOLS,
  resolveCredentials,
  type PrivyCredentials,
} from "@graphitti/privy-core";
import { parseToolParamsFromMessage } from "./parse-tool-params.js";

function envCredentials(runtime: IAgentRuntime): PrivyCredentials {
  const base = resolveCredentials();
  return {
    ...base,
    PRIVY_APP_ID: runtime.getSetting("PRIVY_APP_ID") ?? base.PRIVY_APP_ID,
    PRIVY_APP_SECRET:
      runtime.getSetting("PRIVY_APP_SECRET") ?? base.PRIVY_APP_SECRET,
    PRIVY_AUTHORIZATION_KEY:
      runtime.getSetting("PRIVY_AUTHORIZATION_KEY") ??
      base.PRIVY_AUTHORIZATION_KEY,
    GRAPHITTI_BASE_URL:
      runtime.getSetting("GRAPHITTI_BASE_URL") ?? base.GRAPHITTI_BASE_URL,
    GRAPHITTI_API_KEY:
      runtime.getSetting("GRAPHITTI_API_KEY") ?? base.GRAPHITTI_API_KEY,
  };
}

function toActionName(toolName: string): string {
  return toolName.toUpperCase();
}

function createPrivyAction(toolName: string, description: string): Action {
  const actionName = toActionName(toolName);
  return {
    name: actionName,
    similes: [toolName, toolName.replace(/^privy_/, "")],
    description,
    examples: [],
    validate: async (runtime) => {
      const creds = envCredentials(runtime);
      if (!creds.PRIVY_APP_SECRET && toolName === "privy_whoami") {
        return Boolean(creds.GRAPHITTI_API_KEY);
      }
      return Boolean(creds.PRIVY_APP_ID) && Boolean(creds.PRIVY_APP_SECRET);
    },
    handler: async (
      runtime: IAgentRuntime,
      message: Memory,
      _state?: State,
      _options?: Record<string, unknown>,
      callback?: HandlerCallback
    ): Promise<ActionResult> => {
      const creds = envCredentials(runtime);
      const params = parseToolParamsFromMessage(message, ["goal", "query"]);
      const result = await executePrivyTool(toolName, params, creds);
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

const actions: Action[] = PRIVY_TOOLS.map((tool) =>
  createPrivyAction(tool.name, tool.description)
);

export const privyPlugin: Plugin = {
  name: "privy",
  description:
    "Privy wallet and treasury plugin: server wallets, signing, transfers, policies, intents, and Graphitti treasury workflows.",
  actions,
  providers: [],
  services: [],
  init: async (_config, runtime) => {
    const creds = envCredentials(runtime);
    if (!creds.PRIVY_APP_ID || !creds.PRIVY_APP_SECRET) {
      logger.warn(
        "[plugin-privy] PRIVY_APP_ID and PRIVY_APP_SECRET are not fully configured; privy actions will not validate until set."
      );
    }
  },
};

export default privyPlugin;
export { privyPlugin as plugin };
