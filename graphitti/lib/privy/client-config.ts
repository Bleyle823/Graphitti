export function getPrivyPublicAppId(): string | undefined {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  return appId || undefined;
}

/**
 * Key quorum ID registered in the Privy dashboard for server-side wallet signing.
 * Required for addSigners so workflow steps can eth_sendTransaction without a popup.
 */
export function getPrivySignerId(): string | undefined {
  const signerId = process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID?.trim();
  return signerId || undefined;
}

export function isPrivyConfigured(): boolean {
  return Boolean(getPrivyPublicAppId());
}
