import { createPrivateKey, sign } from "node:crypto";

const PRIVY_API_ORIGIN = "https://api.privy.io";
const WALLET_ACTION_PATH = /^\/v1\/wallets\/[^/]+\//;
const WALLET_AUTH_PREFIX = /^wallet-auth:/;
const WHITESPACE = /\s+/g;
const PEM_LINE = /.{1,64}/g;
const TRAILING_SLASH = /\/$/;

export function canonicalizeJson(value: unknown): string {
  if (value === null) {
    return "null";
  }

  const valueType = typeof value;
  if (valueType === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Cannot canonicalize a non-finite number");
    }
    return JSON.stringify(value);
  }
  if (valueType === "boolean" || valueType === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((item) => (item === undefined ? "null" : canonicalizeJson(item)))
      .join(",")}]`;
  }
  if (valueType === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`)
      .join(",")}}`;
  }

  throw new Error(`Cannot canonicalize ${valueType}`);
}

export function needsAuthorizationSignature(
  method: string,
  path: string
): boolean {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") {
    return false;
  }

  const pathname = path.split("?")[0] ?? path;

  if (
    verb === "POST" &&
    (pathname === "/v1/wallets" ||
      pathname === "/v1/policies" ||
      pathname === "/v1/key_quorums" ||
      pathname === "/v1/organizations" ||
      pathname === "/v1/users")
  ) {
    return false;
  }

  if (WALLET_ACTION_PATH.test(pathname)) {
    return true;
  }
  if (pathname.startsWith("/v1/intents")) {
    return true;
  }
  if (verb === "PATCH" || verb === "PUT" || verb === "DELETE") {
    return true;
  }

  return false;
}

function authorizationKeyToPem(rawKey: string): string {
  const stripped = rawKey.replace(WALLET_AUTH_PREFIX, "").trim();
  if (stripped.includes("BEGIN PRIVATE KEY")) {
    return stripped;
  }

  const body = stripped.replace(WHITESPACE, "");
  const wrapped = body.match(PEM_LINE)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${wrapped}\n-----END PRIVATE KEY-----`;
}

export function parseJsonBody(body: unknown): Record<string, unknown> {
  if (body == null || body === "") {
    return {};
  }
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof body === "object" && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function createPrivyAuthorizationSignature(input: {
  method: string;
  path: string;
  body: unknown;
  appId: string;
  authorizationKey: string;
  extraPrivyHeaders?: Record<string, string>;
}): string {
  const url = `${PRIVY_API_ORIGIN}${input.path.split("?")[0]}`.replace(
    TRAILING_SLASH,
    ""
  );
  const headers: Record<string, string> = {
    "privy-app-id": input.appId,
  };
  if (input.extraPrivyHeaders) {
    for (const [key, value] of Object.entries(input.extraPrivyHeaders)) {
      if (key.toLowerCase().startsWith("privy-") && key !== "privy-app-id") {
        headers[key] = value;
      }
    }
  }

  const payload = {
    version: 1,
    method: input.method.toUpperCase(),
    url,
    body: parseJsonBody(input.body),
    headers,
  };

  const serialized = canonicalizeJson(payload);
  const privateKey = createPrivateKey({
    key: authorizationKeyToPem(input.authorizationKey),
    format: "pem",
  });
  return sign("sha256", Buffer.from(serialized), privateKey).toString("base64");
}
