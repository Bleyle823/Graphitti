import { createHash, randomBytes } from "node:crypto";

export const PERSONAL_API_KEY_PREFIX = "wfb_";
export const ORG_API_KEY_PREFIX = "gr_";

export type ApiKeyKind = "personal" | "organization";

export function isSupportedApiKeyPrefix(key: string): boolean {
  return (
    key.startsWith(PERSONAL_API_KEY_PREFIX) ||
    key.startsWith(ORG_API_KEY_PREFIX)
  );
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function mintApiKey(kind: ApiKeyKind): {
  key: string;
  hash: string;
  prefix: string;
} {
  const prefix =
    kind === "organization" ? ORG_API_KEY_PREFIX : PERSONAL_API_KEY_PREFIX;
  const randomPart = randomBytes(24).toString("base64url");
  const key = `${prefix}${randomPart}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, prefix.length + 7),
  };
}
