import "server-only";

const PRIVY_API = "https://api.privy.io";

export type PrivyWallet = {
  id: string;
  address: string;
  chain_type: string;
};

export type PrivyLinkedAccount = {
  type: string;
  address?: string;
  chain_type?: string;
  id?: string;
  wallet_client_type?: string;
  connector_type?: string;
};

export type PrivyUser = {
  id: string;
  linked_accounts?: PrivyLinkedAccount[];
  wallets?: PrivyWallet[];
};

function getAppCredentials(): { appId: string; appSecret: string } {
  const appId =
    process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "PRIVY_APP_ID and PRIVY_APP_SECRET must be configured to call Privy."
    );
  }
  return { appId, appSecret };
}

function basicAuthHeader(appId: string, appSecret: string): string {
  return `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
}

export async function privyFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { appId, appSecret } = getAppCredentials();
  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(appId, appSecret),
    "privy-app-id": appId,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  const authorizationKey = process.env.PRIVY_AUTHORIZATION_KEY;
  if (authorizationKey && !headers["privy-authorization-signature"]) {
    headers["privy-authorization-key"] = authorizationKey;
  }

  const response = await fetch(`${PRIVY_API}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : typeof body === "object" &&
            body &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : `Privy HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export async function getPrivyUser(privyUserId: string): Promise<PrivyUser> {
  return privyFetch<PrivyUser>(`/v1/users/${encodeURIComponent(privyUserId)}`);
}

export async function listPrivyWallets(): Promise<{ data: PrivyWallet[] }> {
  return privyFetch<{ data: PrivyWallet[] }>("/v1/wallets");
}

export async function createPrivyWallet(chainType = "ethereum"): Promise<PrivyWallet> {
  return privyFetch<PrivyWallet>("/v1/wallets", {
    method: "POST",
    body: JSON.stringify({ chain_type: chainType }),
  });
}

export async function getPrivyWallet(walletId: string): Promise<PrivyWallet> {
  return privyFetch<PrivyWallet>(`/v1/wallets/${walletId}`);
}

export async function getPrivyWalletTransaction(
  walletId: string,
  transactionId: string
): Promise<Record<string, unknown>> {
  return privyFetch<Record<string, unknown>>(
    `/v1/wallets/${walletId}/transactions/${transactionId}`
  );
}

export function getPrivyAppId(): string | undefined {
  return process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}
