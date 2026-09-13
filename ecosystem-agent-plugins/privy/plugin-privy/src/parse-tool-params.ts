import type { Memory } from "@elizaos/core";

export function parseToolParamsFromMessage(
  message: Memory,
  fallbackKeys: string[]
): Record<string, unknown> {
  const text = message.content.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return fallbackFromPlainText(text, fallbackKeys);
    }
  }
  if (text.trim()) {
    return fallbackFromPlainText(text, fallbackKeys);
  }
  return {};
}

function fallbackFromPlainText(
  text: string,
  fallbackKeys: string[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const key of fallbackKeys) {
    params[key] = text;
  }
  return params;
}
