import type { ExecuteParams } from "./types.js";

export function strParam(params: ExecuteParams, key: string): string | undefined {
  const snake = params[key];
  if (typeof snake === "string" && snake.trim()) {
    return snake.trim();
  }
  const camel = params[camelCase(key)];
  if (typeof camel === "string" && camel.trim()) {
    return camel.trim();
  }
  return undefined;
}

function camelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
