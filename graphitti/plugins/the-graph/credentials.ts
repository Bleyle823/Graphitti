import { fetchCredentials } from "@/lib/credential-fetcher";

export type TheGraphCredentials = {
  THEGRAPH_API_KEY?: string;
  SUBSTREAMS_API_KEY?: string;
  THEGRAPH_MARKET_BEARER?: string;
};

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

export function resolveTheGraphCredentials(
  fetched: TheGraphCredentials = {}
): TheGraphCredentials {
  const fetchedGateway = normalizeApiKey(fetched.THEGRAPH_API_KEY);
  const envGateway = normalizeApiKey(process.env.THEGRAPH_API_KEY);
  const gatewayKey =
    fetchedGateway && validateGatewayApiKey(fetchedGateway).ok
      ? fetchedGateway
      : envGateway;

  const fetchedSubstreams = fetched.SUBSTREAMS_API_KEY?.trim();
  const envSubstreams = process.env.SUBSTREAMS_API_KEY?.trim();

  return {
    THEGRAPH_API_KEY: gatewayKey,
    SUBSTREAMS_API_KEY: fetchedSubstreams || envSubstreams || undefined,
    THEGRAPH_MARKET_BEARER:
      fetched.THEGRAPH_MARKET_BEARER?.trim() ||
      process.env.THEGRAPH_MARKET_BEARER?.trim() ||
      undefined,
  };
}

export async function loadTheGraphCredentials(
  integrationId?: string
): Promise<TheGraphCredentials> {
  const fetched = integrationId
    ? ((await fetchCredentials(integrationId)) as TheGraphCredentials)
    : {};
  return resolveTheGraphCredentials(fetched);
}

export function validateGatewayApiKey(apiKey: string | undefined) {
  if (!apiKey?.trim()) {
    return {
      ok: false as const,
      error:
        "THEGRAPH_API_KEY is not configured. Add your Studio key in Project Integrations or set THEGRAPH_API_KEY in .env.local.",
    };
  }
  const trimmed = apiKey.trim();
  if (UNRESOLVED_TEMPLATE.test(trimmed)) {
    return {
      ok: false as const,
      error: `THEGRAPH_API_KEY contains an unresolved template (${trimmed}). Connect a The Graph integration on the node.`,
    };
  }
  if (!/^[a-f0-9]{32}$/i.test(trimmed)) {
    return {
      ok: false as const,
      error:
        "THEGRAPH_API_KEY is not a valid Graph Studio gateway key (expected 32 hex characters from thegraph.com/studio). Do not paste SUBSTREAMS_API_KEY (server_…) or a deploy token into the Studio / Gateway field.",
    };
  }
  return { ok: true as const, apiKey: trimmed };
}
