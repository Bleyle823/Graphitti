import { readJson } from "@/lib/http-json";
import { getErrorMessage } from "@/lib/utils";

const ADMIN = "https://admin.streamingfast.io";

export async function marketGet(
  path: string,
  bearer: string
): Promise<{ httpStatus: number; data: unknown; error?: string }> {
  const url = `${ADMIN}${path}`;
  try {
    const response = await fetch(url, {
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
  } catch (error) {
    return {
      httpStatus: 0,
      data: null,
      error: `Market request failed (${url}): ${getErrorMessage(error)}`,
    };
  }
}
