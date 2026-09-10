import { Type } from "typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  executePrivyTool,
  PRIVY_TOOLS,
  resolveCredentials,
  type PrivyCredentials,
} from "@sugarhi11/privy-core";

type PluginApi = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      parameters: ReturnType<typeof Type.Object>;
      execute: (
        id: string,
        params: Record<string, unknown>
      ) => Promise<{
        content: Array<{ type: "text"; text: string }>;
        details: unknown;
      }>;
    },
    meta: { name: string; optional?: boolean }
  ) => void;
};

function credentialsFromEnv(): PrivyCredentials {
  return resolveCredentials();
}

function paramsSchema(toolParams: Record<string, unknown>) {
  const properties = toolParams.properties as Record<string, unknown> | undefined;
  if (!properties) {
    return Type.Object({});
  }
  const shape: Record<string, ReturnType<typeof Type.Unknown>> = {};
  for (const key of Object.keys(properties)) {
    shape[key] = Type.Optional(Type.Unknown());
  }
  return Type.Object(shape, { additionalProperties: true });
}

export default definePluginEntry({
  id: "privy",
  name: "Privy",
  description:
    "Privy wallet and treasury plugin: server wallets, signing, transfers, policies, intents, and Graphitti treasury workflows.",

  register(api: PluginApi) {
    for (const tool of PRIVY_TOOLS) {
      api.registerTool(
        {
          name: tool.name,
          description: tool.description,
          parameters: paramsSchema(tool.parameters),
          async execute(_id: string, params: Record<string, unknown>) {
            const result = await executePrivyTool(
              tool.name,
              params,
              credentialsFromEnv()
            );
            const text = result.success
              ? JSON.stringify(result.data, null, 2)
              : result.error;
            return {
              content: [{ type: "text", text }],
              details: result.success ? result.data : { error: result.error },
            };
          },
        },
        tool.optional ? { name: tool.name, optional: true } : { name: tool.name }
      );
    }
  },
});
