export function getPrivyPublicAppId(): string | undefined {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  return appId || undefined;
}

export function isPrivyConfigured(): boolean {
  return Boolean(getPrivyPublicAppId());
}
