import { graphQlPost, subgraphQueryUrl } from "@/lib/the-graph/gateway";

// Public Graph Network subgraph on Arbitrum — used as a known gateway target.
const CONNECTION_TEST_SUBGRAPH_ID =
  "DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp";
const META_QUERY = "{ _meta { block { number } } }";

export async function testTheGraph(credentials: Record<string, string>) {
  const apiKey = credentials.THEGRAPH_API_KEY?.trim();

  if (!apiKey) {
    return {
      success: false,
      error:
        "THEGRAPH_API_KEY is not configured. Add your Studio/gateway key in Project Integrations.",
    };
  }

  try {
    const result = await graphQlPost({
      url: subgraphQueryUrl(CONNECTION_TEST_SUBGRAPH_ID),
      apiKey,
      query: META_QUERY,
    });

    if (result.httpStatus === 401 || result.httpStatus === 403) {
      return {
        success: false,
        error: `Gateway rejected the API key (HTTP ${result.httpStatus}).`,
      };
    }

    if (result.errors?.length) {
      return {
        success: false,
        error: result.errors.map((item) => item.message).join("; "),
      };
    }

    if (result.httpStatus >= 400) {
      return {
        success: false,
        error: `Gateway HTTP ${result.httpStatus}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
