import { describe, expect, it } from "vitest";
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
});
