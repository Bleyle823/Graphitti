import { describe, expect, it } from "vitest";
import { flattenGraphqlQueryPayload } from "../query-payload";

describe("flattenGraphqlQueryPayload", () => {
  it("exposes GraphQL root fields next to nested data", () => {
    const payload = flattenGraphqlQueryPayload({
      data: {
        swaps: [{ id: "0xabc-0-1", amountUSD: "250000" }],
        market: { totalValueLockedUSD: "100" },
      },
      errors: [],
      httpStatus: 200,
      query_url: "https://example.test/query",
      query_url_x402: "https://example.test/x402",
    });

    expect(payload.swaps).toEqual([{ id: "0xabc-0-1", amountUSD: "250000" }]);
    expect(payload.market).toEqual({ totalValueLockedUSD: "100" });
    expect(payload.data).toEqual({
      swaps: [{ id: "0xabc-0-1", amountUSD: "250000" }],
      market: { totalValueLockedUSD: "100" },
    });
  });
});
