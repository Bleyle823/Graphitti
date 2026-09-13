import type { IAgentRuntime, Memory } from "@elizaos/core";
import { describe, expect, it, vi } from "vitest";
import { theGraphPlugin } from "./index.js";

describe("plugin-the-graph", () => {
  it("registers graph actions", () => {
    expect(theGraphPlugin.name).toBe("the-graph");
    expect(theGraphPlugin.actions.length).toBeGreaterThan(20);
    expect(
      theGraphPlugin.actions.some((a) => a.name === "GRAPH_RECOMMEND_SUBGRAPH")
    ).toBe(true);
    expect(
      theGraphPlugin.actions.some((a) => a.name === "GRAPH_QUERY_SUBSTREAMS_ENTITY")
    ).toBe(true);
  });

  it("returns structured failure when THEGRAPH_API_KEY is missing", async () => {
    const runtime = {
      getSetting: () => undefined,
    } as IAgentRuntime;
    const action = theGraphPlugin.actions.find(
      (a) => a.name === "GRAPH_SEARCH_SUBGRAPHS"
    );
    expect(action).toBeDefined();
    if (!action) {
      return;
    }
    expect(await action.validate(runtime)).toBe(false);

    const callback = vi.fn();
    const message = { content: { text: "uniswap", source: "test" } } as Memory;
    const result = await action.handler(
      runtime,
      message,
      undefined,
      undefined,
      callback
    );
    expect(result?.success).toBe(false);
    expect(result?.text).toContain("THEGRAPH_API_KEY");
  });
});
