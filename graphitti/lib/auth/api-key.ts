import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

export type ApiKeyValidation =
  | { valid: true; userId: string; apiKeyId: string }
  | { valid: false; error: string; statusCode: number };

export function extractBearerToken(
  authHeader: string | null
): string | undefined {
  if (!authHeader) {
    return;
  }
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
}

export async function validateApiKey(
  authHeader: string | null,
  expectedUserId?: string
): Promise<ApiKeyValidation> {
  if (!authHeader) {
    return {
      valid: false,
      error: "Missing Authorization header",
      statusCode: 401,
    };
  }

  const key = extractBearerToken(authHeader);
  if (!key?.startsWith("wfb_")) {
    return { valid: false, error: "Invalid API key format", statusCode: 401 };
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key", statusCode: 401 };
  }

  if (expectedUserId && apiKey.userId !== expectedUserId) {
    return {
      valid: false,
      error: "You do not have permission to run this workflow",
      statusCode: 403,
    };
  }

  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id))
    .catch(() => {
      // Fire and forget
    });

  return { valid: true, userId: apiKey.userId, apiKeyId: apiKey.id };
}
