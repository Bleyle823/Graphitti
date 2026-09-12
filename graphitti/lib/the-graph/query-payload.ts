type GraphQlObject = Record<string, unknown>;

function asObject(value: unknown): GraphQlObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as GraphQlObject;
}

export type FlattenedGraphqlQueryPayload = Record<string, unknown> & {
  data: unknown;
  errors: Array<{ message: string }>;
  httpStatus: number;
  query_url: string;
  query_url_x402: string;
};

/**
 * Lift GraphQL root fields onto the step payload so templates like
 * `data.swaps.0.id` and `data.market.totalValueLockedUSD` resolve.
 */
export function flattenGraphqlQueryPayload(payload: {
  data?: unknown;
  errors?: Array<{ message: string }>;
  httpStatus: number;
  query_url: string;
  query_url_x402: string;
}): FlattenedGraphqlQueryPayload {
  const graphqlData = asObject(payload.data) ?? {};
  return {
    ...graphqlData,
    data: payload.data ?? null,
    errors: payload.errors ?? [],
    httpStatus: payload.httpStatus,
    query_url: payload.query_url,
    query_url_x402: payload.query_url_x402,
  };
}
