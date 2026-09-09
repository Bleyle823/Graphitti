import type { PrivyCredentials } from "./types.js";

export function resolveCredentials(
  env: NodeJS.ProcessEnv = process.env
): PrivyCredentials {
  return {
    PRIVY_APP_ID: env.PRIVY_APP_ID?.trim() || env.NEXT_PUBLIC_PRIVY_APP_ID?.trim(),
    PRIVY_APP_SECRET: env.PRIVY_APP_SECRET?.trim(),
    PRIVY_AUTHORIZATION_KEY: env.PRIVY_AUTHORIZATION_KEY?.trim(),
    GRAPHITTI_BASE_URL:
      env.GRAPHITTI_BASE_URL?.trim() || "https://graphitti-five.vercel.app",
    GRAPHITTI_API_KEY: env.GRAPHITTI_API_KEY?.trim(),
  };
}

export function validatePrivyCredentials(credentials: PrivyCredentials) {
  if (!credentials.PRIVY_APP_ID?.trim()) {
    return { ok: false as const, error: "PRIVY_APP_ID is not configured." };
  }
  if (!credentials.PRIVY_APP_SECRET?.trim()) {
    return { ok: false as const, error: "PRIVY_APP_SECRET is not configured." };
  }
  return {
    ok: true as const,
    appId: credentials.PRIVY_APP_ID.trim(),
    appSecret: credentials.PRIVY_APP_SECRET.trim(),
  };
}

export function requirePrivyCredentials(credentials: PrivyCredentials) {
  const validated = validatePrivyCredentials(credentials);
  if (!validated.ok) {
    return validated.error;
  }
  return validated;
}

export function hasGraphittiKey(credentials: PrivyCredentials): boolean {
  return Boolean(credentials.GRAPHITTI_API_KEY?.trim());
}
