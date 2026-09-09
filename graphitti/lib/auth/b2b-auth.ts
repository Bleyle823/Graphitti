import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { extractBearerToken } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

export const DEFAULT_B2B_SCOPES = [
  "workflows:*",
  "marketplace:*",
  "wallet:read",
] as const;

export type B2bAuthContext = {
  userId: string;
  apiKeyId: string;
  organizationId?: string | null;
  scopes: string[];
};

export type B2bAuthResult =
  | { success: true; auth: B2bAuthContext }
  | { success: false; error: string; status: number };

function normalizeScopes(raw: string[] | null | undefined): string[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw;
  }
  return [...DEFAULT_B2B_SCOPES];
}

export function scopeAllows(granted: string[], required: string): boolean {
  if (granted.includes(required)) {
    return true;
  }
  const [requiredPrefix] = required.split(":");
  return granted.includes(`${requiredPrefix}:*`);
}

export function requireScopes(granted: string[], required: string[]): boolean {
  return required.every((scope) => scopeAllows(granted, scope));
}

export async function requireB2bAuth(
  authHeader: string | null,
  requiredScopes: string[] = []
): Promise<B2bAuthResult> {
  const key = extractBearerToken(authHeader);
  if (!key?.startsWith("wfb_")) {
    return {
      success: false,
      error: "Missing or invalid Authorization Bearer wfb_ API key",
      status: 401,
    };
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  });

  if (!apiKey) {
    return { success: false, error: "Invalid API key", status: 401 };
  }

  const scopes = normalizeScopes(apiKey.scopes);
  if (requiredScopes.length > 0 && !requireScopes(scopes, requiredScopes)) {
    return { success: false, error: "Insufficient API key scope", status: 403 };
  }

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch(() => {
      // Fire and forget
    });

  return {
    success: true,
    auth: {
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      organizationId: apiKey.organizationId,
      scopes,
    },
  };
}

export function resolveOrganizationId(
  auth: B2bAuthContext,
  bodyOrganizationId?: string | null
): string | null {
  return auth.organizationId ?? bodyOrganizationId ?? null;
}
