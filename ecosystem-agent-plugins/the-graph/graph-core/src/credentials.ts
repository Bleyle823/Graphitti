import type { GraphCredentials } from "./types.js";

const UNRESOLVED_TEMPLATE = /\{\{@?[^}]+\}\}/;

function normalizeApiKey(raw: string | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  let key = raw.trim();
  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice(7).trim();
  }
  return key || undefined;
}

export function resolveCredentials(
  env: NodeJS.ProcessEnv = process.env
): GraphCredentials {
  const gatewayKey = normalizeApiKey(env.THEGRAPH_API_KEY);
  return {
    THEGRAPH_API_KEY: gatewayKey,
    SUBSTREAMS_API_KEY: env.SUBSTREAMS_API_KEY?.trim() || undefined,
    THEGRAPH_MARKET_BEARER: env.THEGRAPH_MARKET_BEARER?.trim() || undefined,
    GRAPHITTI_BASE_URL:
      env.GRAPHITTI_BASE_URL?.trim() || "https://graphitti-five.vercel.app",
    GRAPHITTI_API_KEY: env.GRAPHITTI_API_KEY?.trim() || undefined,
  };
}

export function validateGatewayApiKey(apiKey: string | undefined) {
  if (!apiKey?.trim()) {
    return {
      ok: false as const,
      error:
        "THEGRAPH_API_KEY is not configured. Add your 32-character Studio key from thegraph.com/studio.",
    };
  }
  const trimmed = apiKey.trim();
  if (UNRESOLVED_TEMPLATE.test(trimmed)) {
    return { ok: false as const, error: "THEGRAPH_API_KEY contains an unresolved template." };
  }
  if (!/^[a-f0-9]{32}$/i.test(trimmed)) {
    return {
      ok: false as const,
      error:
        "THEGRAPH_API_KEY must be a 32-character hex Studio/gateway key (not SUBSTREAMS_API_KEY).",
    };
  }
  return { ok: true as const, apiKey: trimmed };
}

export function requireGatewayKey(credentials: GraphCredentials) {
  const validated = validateGatewayApiKey(credentials.THEGRAPH_API_KEY);
  if (!validated.ok) {
    return validated.error;
  }
  return validated.apiKey;
}

export function requireMarketBearer(credentials: GraphCredentials) {
  const bearer = credentials.THEGRAPH_MARKET_BEARER?.trim();
  if (!bearer) {
    return "THEGRAPH_MARKET_BEARER is not configured.";
  }
  return bearer;
}

export function hasGraphittiKey(credentials: GraphCredentials): boolean {
  return Boolean(credentials.GRAPHITTI_API_KEY?.trim());
}
