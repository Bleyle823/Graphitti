import {
  CIRCLE_API,
  CIRCLE_MINT_SANDBOX,
  circleFetch,
} from "@/lib/circle/client";

type TestResult = { success: true } | { success: false; error: string };

/**
 * Circle exposes two unrelated API families and the keys are not interchangeable:
 *
 * - Programmable Wallets (W3S) on api.circle.com/v1/w3s/*, keyed by
 *   TEST_API_KEY / LIVE_API_KEY. Every step in this plugin except `mint` uses it.
 * - Circle Mint on api-sandbox.circle.com/v1/*, keyed by SAND_API_KEY.
 *
 * Each key must therefore be probed against its own API. Probing a W3S key
 * against a Mint endpoint (or vice versa) returns 401 for a perfectly valid key.
 */
async function testWalletsApiKey(apiKey: string): Promise<TestResult> {
  if (apiKey.startsWith("SAND_API_KEY:")) {
    return {
      success: false,
      error:
        "That looks like a Circle Mint sandbox key. Put it in CIRCLE_MINT_API_KEY — CIRCLE_API_KEY expects a Programmable Wallets key (TEST_API_KEY / LIVE_API_KEY).",
    };
  }

  // Entity config is the cheapest key-scoped read and needs no existing wallets.
  const result = await circleFetch<{
    data?: { publicKey?: string };
    publicKey?: string;
  }>({
    baseUrl: CIRCLE_API,
    path: "/v1/w3s/config/entity/publicKey",
    apiKey,
  });

  if (result.httpStatus === 401 || result.httpStatus === 403) {
    return {
      success: false,
      error: `Circle rejected CIRCLE_API_KEY on the Programmable Wallets API (HTTP ${result.httpStatus}: ${result.error}). Confirm the key starts with TEST_API_KEY or LIVE_API_KEY and was copied whole, including both colon-separated segments.`,
    };
  }
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true };
}

async function testMintApiKey(mintKey: string): Promise<TestResult> {
  const result = await circleFetch<unknown>({
    baseUrl: CIRCLE_MINT_SANDBOX,
    path: "/v1/configuration",
    apiKey: mintKey,
  });

  if (result.httpStatus === 401 || result.httpStatus === 403) {
    return { success: false, error: "Invalid CIRCLE_MINT_API_KEY" };
  }
  if (result.error) {
    return { success: false, error: result.error };
  }
  return { success: true };
}

export async function testCircle(credentials: Record<string, string>) {
  const apiKey = credentials.CIRCLE_API_KEY;
  const mintKey = credentials.CIRCLE_MINT_API_KEY;

  if (!(apiKey || mintKey)) {
    return {
      success: false,
      error: "CIRCLE_API_KEY or CIRCLE_MINT_API_KEY is required",
    };
  }

  try {
    if (apiKey) {
      const walletsResult = await testWalletsApiKey(apiKey);
      if (!walletsResult.success) {
        return walletsResult;
      }
    }

    if (mintKey) {
      const mintResult = await testMintApiKey(mintKey);
      if (!mintResult.success) {
        return mintResult;
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
