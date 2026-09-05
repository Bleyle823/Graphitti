import { ARC_MARKETPLACE_ASSET, ARC_MARKETPLACE_CHAIN } from "./constants";

export function buildOpenApiDocument(options: {
  origin: string;
  listings: Array<{
    listedSlug: string | null;
    name: string;
    description: string | null;
    priceUsdcPerCall: string | null;
    inputSchema: Record<string, unknown> | null;
  }>;
}) {
  const paths: Record<string, unknown> = {
    "/api/mcp/workflows": {
      get: {
        operationId: "search_workflows",
        summary: "Search listed workflows",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "chain", in: "query", schema: { type: "string" } },
          {
            name: "workflowType",
            in: "query",
            schema: { type: "string", enum: ["read", "write"] },
          },
        ],
        responses: { "200": { description: "Catalog page" } },
      },
    },
    "/api/mcp/workflows/{slug}/call": {
      post: {
        operationId: "call_workflow",
        summary: "Call a listed workflow",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
        responses: {
          "200": { description: "Mapped outputs" },
          "402": {
            description:
              "Payment required in Arc USDC (x402 exact scheme, 6-decimal amount)",
          },
        },
      },
    },
  };

  for (const listing of options.listings) {
    if (!listing.listedSlug) {
      continue;
    }
    paths[`/api/mcp/workflows/${listing.listedSlug}/call`] = {
      post: {
        operationId: `call_${listing.listedSlug.replace(/[^a-z0-9]+/g, "_")}`,
        summary: listing.name,
        description: listing.description ?? undefined,
        requestBody: {
          content: {
            "application/json": {
              schema: listing.inputSchema ?? {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: { "200": { description: "Mapped outputs" } },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Graphitti Marketplace",
      version: "1.0.0",
      description:
        "Public catalog and call APIs. Paid listings settle in Arc USDC.",
    },
    servers: [{ url: options.origin }],
    paths,
    "x-graphitti-settlement": {
      network: `eip155:${ARC_MARKETPLACE_CHAIN.chainId}`,
      asset: ARC_MARKETPLACE_ASSET,
      decimals: 6,
    },
  };
}
