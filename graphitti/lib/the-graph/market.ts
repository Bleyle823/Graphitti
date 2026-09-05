import { readJson } from "@/lib/http-json";

const ADMIN = "https://admin.streamingfast.io";

export async function marketGet(
  path: string,
  bearer: string
): Promise<{ httpStatus: number; data: unknown; error?: string }> {
  const response = await fetch(`${ADMIN}${path}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json",
    },
  });
  const data = await readJson<Record<string, unknown>>(response);
  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : `Market HTTP ${response.status}`;
    return { httpStatus: response.status, data, error: message };
  }
  return { httpStatus: response.status, data };
}
