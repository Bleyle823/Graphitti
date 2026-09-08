import { graphQlPost, subgraphQueryUrl } from "@/lib/the-graph/gateway";
import {
  resolveTheGraphCredentials,
  validateGatewayApiKey,
} from "./credentials";
import { graphqlErrorMessage as formatGraphqlError } from "./steps/shared";

// Public Graph Network subgraph on Arbitrum — used as a known gateway target.
const CONNECTION_TEST_SUBGRAPH_ID =
  "DZz4kDTdmzWLWsV373w2bSmoar3umKKH9y82SUKr5qmp";
const META_QUERY = "{ _meta { block { number } } }";

export async function testTheGraph(credentials: Record<string, string>) {
  const resolved = resolveTheGraphCredentials(
    credentials as {
      THEGRAPH_API_KEY?: string;
      SUBSTREAMS_API_KEY?: string;
      THEGRAPH_MARKET_BEARER?: string;
    }
  );
  const validated = validateGatewayApiKey(resolved.THEGRAPH_API_KEY);

  if (!validated.ok) {
    return {
      success: false,
      error: validated.error,
    };
  }

  try {
    const result = await graphQlPost({
      url: subgraphQueryUrl(CONNECTION_TEST_SUBGRAPH_ID),
      apiKey: validated.apiKey,
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
        error: formatGraphqlError(result.errors) ?? "GraphQL query failed",
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
