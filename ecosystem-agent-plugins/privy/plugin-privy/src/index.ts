import type { Action, IAgentRuntime, Memory, Plugin } from "@elizaos/core";
import {
  executePrivyTool,
  PRIVY_TOOLS,
  resolveCredentials,
  type PrivyCredentials,
} from "@bleyle823/privy-core";

function envCredentials(runtime: IAgentRuntime): PrivyCredentials {
  const base = resolveCredentials();
  return {
    ...base,
    PRIVY_APP_ID:
      runtime.getSetting("PRIVY_APP_ID") ?? base.PRIVY_APP_ID,
    PRIVY_APP_SECRET:
      runtime.getSetting("PRIVY_APP_SECRET") ?? base.PRIVY_APP_SECRET,
    PRIVY_AUTHORIZATION_KEY:
      runtime.getSetting("PRIVY_AUTHORIZATION_KEY") ?? base.PRIVY_AUTHORIZATION_KEY,
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
  return {
    name: toActionName(toolName),
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
    handler: async (runtime, message) => {
      const creds = envCredentials(runtime);
      const text = message.content.text ?? "";
      let params: Record<string, unknown> = {};
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          params = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
        } catch {
          params = { goal: text, query: text };
        }
      } else if (text.trim()) {
        params = { goal: text, query: text };
      }
      const result = await executePrivyTool(toolName, params, creds);
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
    if (!creds.PRIVY_APP_ID) {
      throw new Error("PRIVY_APP_ID is required for plugin-privy");
    }
    if (!creds.PRIVY_APP_SECRET) {
      throw new Error("PRIVY_APP_SECRET is required for plugin-privy");
    }
  },
};

export default privyPlugin;
export { privyPlugin as plugin };
