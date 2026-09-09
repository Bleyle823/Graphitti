import { describe, expect, it } from "vitest";
import { listAvailableTools } from "./catalog.js";

describe("MCP tools/list contract", () => {
  it("lists only graph_* tool names", () => {
    const tools = listAvailableTools({
      THEGRAPH_API_KEY: "f".repeat(32),
      GRAPHITTI_API_KEY: "wfb_test",
      THEGRAPH_MARKET_BEARER: "market-token",
    });

    expect(tools.length).toBeGreaterThan(30);
    for (const tool of tools) {
      expect(tool.name.startsWith("graph_")).toBe(true);
    }
  });

  it("includes Substreams tools in the catalog", () => {
    const tools = listAvailableTools({ THEGRAPH_API_KEY: "a".repeat(32) });
    const names = tools.map((tool) => tool.name);
    expect(names).toContain("graph_search_substreams_packages");
    expect(names).toContain("graph_query_substreams_entity");
    expect(names).toContain("graph_substreams_webhook_setup");
  });
});
