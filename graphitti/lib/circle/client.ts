import { readJson } from "@/lib/http-json";

export const CIRCLE_API = "https://api.circle.com";
export const CIRCLE_MINT_SANDBOX = "https://api-sandbox.circle.com";
export const CIRCLE_IRIS = "https://iris-api.circle.com";
export const CIRCLE_GATEWAY = "https://gateway-api.circle.com";

export async function circleFetch<T>(options: {
  baseUrl: string;
  path: string;
  method?: string;
  apiKey?: string;
  body?: unknown;
}): Promise<{ httpStatus: number; data: T; error?: string }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.apiKey) {
    headers.Authorization = `Bearer ${options.apiKey}`;
  }

  const response = await fetch(`${options.baseUrl}${options.path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data = await readJson<T>(response);
  if (!response.ok) {
    const record = data as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : `Circle HTTP ${response.status}`;
    return { httpStatus: response.status, data, error: message };
  }
  return { httpStatus: response.status, data };
}
