declare module "eve/tools" {
  import type { GraphToolDefinition } from "@graphitti/graph-core";

  type ToolConfig = {
    name: string;
    description: string;
    inputSchema: GraphToolDefinition["parameters"];
    approval?: { type: "user" };
    execute: (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };

  export function defineTool(config: ToolConfig): ToolConfig;
}
