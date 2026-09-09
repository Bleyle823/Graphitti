export async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return { message: text } as T;
  }
}

export function fail(message: string): { success: false; error: string } {
  return { success: false, error: message };
}

export function ok(data: Record<string, unknown>): { success: true; data: Record<string, unknown> } {
  return { success: true, data };
}
