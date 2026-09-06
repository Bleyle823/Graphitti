const DEFAULT_FPL_GRAPHQL_URL =
  "https://fpl-api-6h0d.onrender.com/graphql";

export async function testFantasyPremierLeague(
  credentials: Record<string, string>
) {
  try {
    const url = credentials.FPL_GRAPHQL_URL?.trim() || DEFAULT_FPL_GRAPHQL_URL;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "query TestConnection { currentEvent { id name } }",
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `FPL GraphQL API returned HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      data?: { currentEvent?: { id?: number } | null };
      errors?: Array<{ message: string }>;
    };
    const graphqlError = payload.errors
      ?.map((item) => item.message)
      .filter(Boolean)
      .join("; ");
    if (graphqlError) {
      return { success: false, error: graphqlError };
    }
    if (!payload.data) {
      return {
        success: false,
        error: "FPL GraphQL API did not return data for currentEvent",
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
