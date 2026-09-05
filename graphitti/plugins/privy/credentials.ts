import { fail } from "@/lib/http-json";

export type PrivyCredentials = {
  PRIVY_APP_ID?: string;
  PRIVY_APP_SECRET?: string;
};

export function applyPrivyCredentials(
  fetched: Record<string, string | undefined> = {}
): ReturnType<typeof fail> | undefined {
  const appId =
    fetched.PRIVY_APP_ID ||
    process.env.PRIVY_APP_ID ||
    process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = fetched.PRIVY_APP_SECRET || process.env.PRIVY_APP_SECRET;

  if (!(appId && appSecret)) {
    return fail(
      "PRIVY_APP_ID and PRIVY_APP_SECRET are not configured. Please add them in Project Integrations."
    );
  }

  process.env.PRIVY_APP_ID = appId;
  process.env.PRIVY_APP_SECRET = appSecret;
  return;
}
