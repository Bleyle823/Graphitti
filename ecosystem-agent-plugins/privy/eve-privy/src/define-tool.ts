import type { PrivyToolDefinition } from "@bleyle823/privy-core";

type ToolConfig = {
  name: string;
  description: string;
  inputSchema: PrivyToolDefinition["parameters"];
  approval?: { type: "user" };
  execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

declare module "eve/tools" {
  export function defineTool(config: ToolConfig): ToolConfig;
}

import { defineTool as eveDefineTool } from "eve/tools";

export function defineTool(config: ToolConfig): ToolConfig {
  return eveDefineTool(config);
}
