import { readJson } from "@/lib/http-json";

export const FPL_BASE = "https://fantasy.premierleague.com/api";
export const FPL_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function fplGet<T>(path: string): Promise<T> {
  const response = await fetch(`${FPL_BASE}${path}`, {
    headers: {
      "User-Agent": FPL_USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`FPL HTTP ${response.status} for ${path}`);
  }
  return readJson<T>(response);
}
