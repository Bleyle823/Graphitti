import { validateGatewayApiKey } from "./credentials.js";
import { GRAPH_TOOL_HANDLERS, listAvailableTools } from "./catalog.js";
import { fail } from "./http.js";
import type { ExecuteParams, GraphCredentials, ToolResult } from "./types.js";

export async function executeGraphTool(
  name: string,
  params: ExecuteParams,
  credentials: GraphCredentials
): Promise<ToolResult> {
  const handler = GRAPH_TOOL_HANDLERS[name];
  if (!handler) {
    return fail(`Unknown tool: ${name}`);
  }

  const tool = listAvailableTools(credentials).find((item) => item.name === name);
  if (!tool) {
    return fail(`Tool ${name} is not available with current credentials.`);
  }

  const gateway = validateGatewayApiKey(credentials.THEGRAPH_API_KEY);
  const needsGateway = !name.startsWith("graph_whoami") &&
    !name.startsWith("graph_search_workflows") &&
    !name.startsWith("graph_get_listing") &&
    !name.startsWith("graph_call_workflow") &&
    !name.startsWith("graph_execute_workflow") &&
    !name.startsWith("graph_get_execution");

  if (needsGateway && !gateway.ok) {
    return fail(gateway.error);
  }

  return handler(params, credentials);
}

export { listAvailableTools, GRAPH_TOOL_HANDLERS } from "./catalog.js";
export { resolveCredentials, validateGatewayApiKey } from "./credentials.js";
export type { GraphCredentials, GraphToolDefinition, ToolResult } from "./types.js";
export { GRAPH_TOOLS } from "./catalog.js";
