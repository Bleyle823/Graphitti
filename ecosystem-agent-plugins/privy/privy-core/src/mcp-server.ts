#!/usr/bin/env node
import { listAvailableTools } from "./catalog.js";
import { resolveCredentials } from "./credentials.js";
import { executePrivyTool } from "./execute.js";
import type { ExecuteParams } from "./types.js";

const credentials = resolveCredentials();

function jsonRpc(id: unknown, result: unknown) {
  return JSON.stringify({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(body: {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
}) {
  const id = body.id ?? null;
  if (body.method === "initialize") {
    return jsonRpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "privy-protocol", version: "0.1.0" },
    });
  }
  if (body.method === "tools/list") {
    const tools = listAvailableTools(credentials).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.parameters,
    }));
    return jsonRpc(id, { tools });
  }
  if (body.method === "tools/call") {
    const name = String(body.params?.name ?? "");
    const args = (body.params?.arguments ?? {}) as ExecuteParams;
    const result = await executePrivyTool(name, args, credentials);
    const text = result.success
      ? JSON.stringify(result.data, null, 2)
      : result.error;
    if (!result.success) {
      return jsonRpc(id, {
        content: [{ type: "text", text }],
        isError: true,
      });
    }
    return jsonRpc(id, {
      content: [{ type: "text", text }],
    });
  }
  return jsonRpcError(id, -32_601, `Method not found: ${body.method}`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    process.stdout.write(jsonRpcError(null, -32_600, "Empty MCP request body"));
    return;
  }
  let body: {
    jsonrpc?: string;
    id?: unknown;
    method?: string;
    params?: Record<string, unknown>;
  };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    process.stdout.write(jsonRpcError(null, -32_700, "Invalid JSON"));
    return;
  }
  const response = await handleRequest(body);
  process.stdout.write(`${response}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
