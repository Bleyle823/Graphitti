import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { graphGetSubstreamsEndpoint } from "./substreams-actions.js";
import { graphRecommendSubgraph } from "./discovery.js";
import { validateGatewayApiKey } from "./credentials.js";
import { listAvailableTools } from "./catalog.js";

describe("validateGatewayApiKey", () => {
  it("rejects missing key", () => {
    const result = validateGatewayApiKey(undefined);
    expect(result.ok).toBe(false);
  });

  it("accepts 32-char hex key", () => {
    const result = validateGatewayApiKey("a".repeat(32));
    expect(result.ok).toBe(true);
  });
});

describe("listAvailableTools", () => {
  it("hides graphitti tools without API key", () => {
    const tools = listAvailableTools({ THEGRAPH_API_KEY: "b".repeat(32) });
    expect(tools.some((t) => t.name === "graph_whoami")).toBe(false);
    expect(tools.some((t) => t.name === "graph_search_subgraphs")).toBe(true);
  });

  it("includes graphitti tools with API key", () => {
    const tools = listAvailableTools({
      THEGRAPH_API_KEY: "c".repeat(32),
      GRAPHITTI_API_KEY: "wfb_test",
    });
    expect(tools.some((t) => t.name === "graph_whoami")).toBe(true);
  });
});

describe("graphGetSubstreamsEndpoint", () => {
  it("returns ethereum endpoint", async () => {
    const result = await graphGetSubstreamsEndpoint(
      { network: "ethereum" },
      { THEGRAPH_API_KEY: "d".repeat(32) }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endpoint).toContain("streamingfast.io");
    }
  });
});

describe("graphRecommendSubgraph", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      Response.json({
        data: {
          subgraphMetadataSearch: [
            {
              displayName: "Uniswap V3",
              subgraphs: [
                {
                  id: "sub1",
                  currentVersion: {
                    subgraphDeployment: {
                      id: "0xdep",
                      ipfsHash: "QmTestHash123456789012345678901234",
                      queryFeesAmount: "1000",
                      manifest: { network: "mainnet" },
                    },
                  },
                },
              ],
            },
          ],
        },
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns ranked subgraphs with query counts", async () => {
    const result = await graphRecommendSubgraph(
      { goal: "uniswap v3 swaps" },
      { THEGRAPH_API_KEY: "e".repeat(32) }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.subgraphs)).toBe(true);
      expect(result.data.volume_check_note).toContain("30-day");
    }
  });
});
