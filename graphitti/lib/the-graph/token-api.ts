import { readJson } from "@/lib/http-json";

const TOKEN_API = "https://token-api.thegraph.com";

export async function tokenApiGet(
  path: string,
  apiKey: string,
  searchParams?: Record<string, string | undefined>
): Promise<{ httpStatus: number; data: unknown; error?: string }> {
  const url = new URL(`${TOKEN_API}${path}`);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  const data = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Token API HTTP ${response.status}`;
    return { httpStatus: response.status, data, error: message };
  }
  return { httpStatus: response.status, data };
}
