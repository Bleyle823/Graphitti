const PRIVY_API_URL = "https://api.privy.io";

export async function testPrivy(credentials: Record<string, string>) {
  try {
    const appId = credentials.PRIVY_APP_ID;
    const appSecret = credentials.PRIVY_APP_SECRET;

    if (!appId) {
      return { success: false, error: "PRIVY_APP_ID is required" };
    }

    if (!appSecret) {
      return { success: false, error: "PRIVY_APP_SECRET is required" };
    }

    const encoded = Buffer.from(`${appId}:${appSecret}`).toString("base64");
    const response = await fetch(`${PRIVY_API_URL}/v1/wallets`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${encoded}`,
        "privy-app-id": appId,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid Privy App ID or App Secret",
        };
      }
      return {
        success: false,
        error: `API error: HTTP ${response.status}`,
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
