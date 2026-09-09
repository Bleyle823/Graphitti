declare module "eve/tools" {
  import type { PrivyToolDefinition } from "@graphitti/privy-core";

  type ToolConfig = {
    name: string;
    description: string;
    inputSchema: PrivyToolDefinition["parameters"];
    approval?: { type: "user" };
    execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };

  export function defineTool(config: ToolConfig): ToolConfig;
}
