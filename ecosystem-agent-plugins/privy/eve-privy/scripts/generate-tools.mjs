import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVY_TOOLS } from "../../privy-core/dist/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const toolsDir = join(__dirname, "../src/tools");

const APPROVAL_TOOLS = new Set([
  "privy_send_transaction",
  "privy_sign_message",
  "privy_sign_typed_data",
  "privy_transfer",
  "privy_wallet_transfer",
  "privy_wallet_swap",
  "privy_create_wallet",
  "privy_call_workflow",
  "privy_execute_workflow",
  "privy_create_treasury_intent",
  "privy_approve_treasury_intent",
]);

mkdirSync(toolsDir, { recursive: true });

for (const tool of PRIVY_TOOLS) {
  const approvalLine = APPROVAL_TOOLS.has(tool.name)
    ? "  approval: { type: \"user\" },\n"
    : "";

  const source = `import { defineTool } from "../define-tool.js";
import { executePrivyTool, resolveCredentials } from "@sugarhi11/privy-core";

export default defineTool({
  name: ${JSON.stringify(tool.name)},
  description: ${JSON.stringify(tool.description)},
  inputSchema: ${JSON.stringify(tool.parameters, null, 2)},
${approvalLine}  async execute(input) {
    const result = await executePrivyTool(
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

console.log(`Generated ${PRIVY_TOOLS.length} Eve tools in ${toolsDir}`);
