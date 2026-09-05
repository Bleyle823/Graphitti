import { CIRCLE_API, CIRCLE_MINT_SANDBOX } from "@/lib/circle/client";

export async function testCircle(credentials: Record<string, string>) {
  const apiKey = credentials.CIRCLE_API_KEY;
  const mintKey = credentials.CIRCLE_MINT_API_KEY;

  if (!apiKey && !mintKey) {
    return {
      success: false,
      error: "CIRCLE_API_KEY or CIRCLE_MINT_API_KEY is required",
    };
  }

  try {
    if (apiKey) {
      const response = await fetch(`${CIRCLE_API}/v1/wallets`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (response.ok || response.status === 404) {
        return { success: true };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Invalid CIRCLE_API_KEY" };
      }
      return { success: false, error: `Circle API HTTP ${response.status}` };
    }

    const response = await fetch(`${CIRCLE_MINT_SANDBOX}/v1/configuration`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${mintKey}`,
      },
    });
    if (response.ok) {
      return { success: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { success: false, error: "Invalid CIRCLE_MINT_API_KEY" };
    }
    return {
      success: false,
      error: `Circle Mint sandbox HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
