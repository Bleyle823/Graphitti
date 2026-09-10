import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GRAPH_TOOLS } from "../../graph-core/dist/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsDir = join(__dirname, "../src/tools");

const APPROVAL_TOOLS = new Set([
  "graph_call_workflow",
  "graph_execute_workflow",
  "graph_substreams_run",
]);

mkdirSync(toolsDir, { recursive: true });

for (const tool of GRAPH_TOOLS) {
  const approvalLine = APPROVAL_TOOLS.has(tool.name)
    ? "  approval: { type: \"user\" },\n"
    : "";

  const source = `import { defineTool } from "../define-tool.js";
import { executeGraphTool, resolveCredentials } from "@sugarhi11/graph-core";

export default defineTool({
  name: ${JSON.stringify(tool.name)},
  description: ${JSON.stringify(tool.description)},
  inputSchema: ${JSON.stringify(tool.parameters, null, 2)},
${approvalLine}  async execute(input) {
    const result = await executeGraphTool(
      ${JSON.stringify(tool.name)},
      input as Record<string, unknown>,
      resolveCredentials()
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data as Record<string, unknown>;
  },
});
`;

  writeFileSync(join(toolsDir, `${tool.name}.ts`), source, "utf8");
}

console.log(`Generated ${GRAPH_TOOLS.length} Eve tools in ${toolsDir}`);
