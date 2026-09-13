import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executeGraphTool, resolveCredentials } from "@graphitti/graph-core";

const GRAPHITTI_ENV = "C:/Users/Public/Graphitti-1/graphitti/.env.local";

function loadTheGraphKeyFromGraphittiEnv(): boolean {
  if (process.env.THEGRAPH_API_KEY?.trim()) {
    return true;
  }
  if (!existsSync(GRAPHITTI_ENV)) {
    return false;
  }
  const text = readFileSync(GRAPHITTI_ENV, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "THEGRAPH_API_KEY" && value) {
      process.env.THEGRAPH_API_KEY = value;
      return true;
    }
  }
  return false;
}

const canRunLive = loadTheGraphKeyFromGraphittiEnv();

describe.skipIf(!canRunLive)("graph-core live (OpenRouter env not required)", () => {
  it("searches subgraphs via Studio gateway", async () => {
    const creds = resolveCredentials();
    const result = await executeGraphTool(
      "graph_search_subgraphs",
      { keyword: "uniswap", first: 1 },
      creds
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    expect(result.data).toBeTruthy();
  });
});
