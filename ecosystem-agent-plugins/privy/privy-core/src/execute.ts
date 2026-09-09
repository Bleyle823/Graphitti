import { validatePrivyCredentials } from "./credentials.js";
import { listAvailableTools, PRIVY_TOOL_HANDLERS, isGraphittiTool } from "./catalog.js";
import { fail } from "./http.js";
import type { ExecuteParams, PrivyCredentials, ToolResult } from "./types.js";

export async function executePrivyTool(
  name: string,
  params: ExecuteParams,
  credentials: PrivyCredentials
): Promise<ToolResult> {
  const handler = PRIVY_TOOL_HANDLERS[name];
  if (!handler) {
    return fail(`Unknown tool: ${name}`);
  }

  const tool = listAvailableTools(credentials).find((item) => item.name === name);
  if (!tool) {
    return fail(`Tool ${name} is not available with current credentials.`);
  }

  if (!isGraphittiTool(name)) {
    const privy = validatePrivyCredentials(credentials);
    if (!privy.ok) {
      return fail(privy.error);
    }
  } else if (
    name !== "privy_search_workflows" &&
    name !== "privy_get_listing" &&
    name !== "privy_call_workflow" &&
    !credentials.GRAPHITTI_API_KEY?.trim()
  ) {
    return fail("GRAPHITTI_API_KEY is required for this tool.");
  }

  return handler(params, credentials);
}

export {
  listAvailableTools,
  PRIVY_TOOL_HANDLERS,
  PRIVY_TOOLS,
  getToolDefinition,
  isGraphittiTool,
} from "./catalog.js";
export { resolveCredentials, validatePrivyCredentials } from "./credentials.js";
export type { PrivyCredentials, PrivyToolDefinition, ToolResult } from "./types.js";
