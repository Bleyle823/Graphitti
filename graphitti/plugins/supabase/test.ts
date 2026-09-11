export async function testSupabase(credentials: Record<string, string>) {
  try {
    const baseUrl = credentials.SUPABASE_URL?.trim().replace(/\/$/, "");
    const anonKey = credentials.SUPABASE_ANON_KEY?.trim();

    if (!baseUrl) {
      return { success: false, error: "SUPABASE_URL is required" };
    }

    if (!anonKey) {
      return { success: false, error: "SUPABASE_ANON_KEY is required" };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      return { success: false, error: "SUPABASE_URL must be a valid URL" };
    }

    if (!parsedUrl.protocol.startsWith("http")) {
      return {
        success: false,
        error: "SUPABASE_URL must start with http:// or https://",
      };
    }

    const response = await fetch(
      `${baseUrl}/rest/v1/backing_snapshots?select=block_number&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          Accept: "application/json",
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: "Invalid anon key. Check Project Settings → API in Supabase.",
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        error:
          "Connected to Supabase but backing_snapshots table was not found.",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Supabase REST error: HTTP ${response.status}`,
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
