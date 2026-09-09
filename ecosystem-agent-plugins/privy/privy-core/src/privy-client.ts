import type { PrivyCredentials } from "./types.js";

const PRIVY_API = "https://api.privy.io";

export type PrivyWallet = {
  id: string;
  address: string;
  chain_type: string;
  policy_ids?: string[];
  owner_id?: string;
};

export type PrivyPolicy = {
  id: string;
  name: string;
  chain_type: string;
};

export type PrivyKeyQuorum = {
  id: string;
  display_name: string | null;
  authorization_threshold: number | null;
  user_ids?: string[] | null;
};

export type PrivyIntent = {
  intent_id: string;
  status: string;
  resource_id?: string;
};

export type PrivyWalletAction = {
  id: string;
  status: string;
  type?: string;
  transaction_hash?: string;
};

export type PrivyUser = {
  id: string;
  linked_accounts?: Array<Record<string, unknown>>;
  wallets?: PrivyWallet[];
};

export type WalletTransferRequest = {
  source: { chain: string; asset: string; amount?: string };
  destination: { address: string; chain?: string; asset?: string };
  amount?: string;
  amount_type?: "exact_input" | "exact_output";
  reference_id?: string;
  nonce?: string;
};

function basicAuthHeader(appId: string, appSecret: string): string {
  return `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
}

export async function privyFetch<T>(
  path: string,
  credentials: PrivyCredentials,
  init: RequestInit = {}
): Promise<T> {
  const appId = credentials.PRIVY_APP_ID?.trim();
  const appSecret = credentials.PRIVY_APP_SECRET?.trim();
  if (!(appId && appSecret)) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be configured.");
  }

  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(appId, appSecret),
    "privy-app-id": appId,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (credentials.PRIVY_AUTHORIZATION_KEY?.trim()) {
    headers["privy-authorization-key"] = credentials.PRIVY_AUTHORIZATION_KEY.trim();
  }

  const response = await fetch(`${PRIVY_API}${path}`, { ...init, headers });
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

export async function getPrivyUser(
  privyUserId: string,
  credentials: PrivyCredentials
): Promise<PrivyUser> {
  return privyFetch<PrivyUser>(
    `/v1/users/${encodeURIComponent(privyUserId)}`,
    credentials
  );
}

export async function searchPrivyUsers(
  query: string,
  credentials: PrivyCredentials
): Promise<{ data: PrivyUser[] }> {
  const params = new URLSearchParams({ search: query, limit: "20" });
  return privyFetch<{ data: PrivyUser[] }>(`/v1/users?${params}`, credentials);
}

export async function listPrivyWallets(
  credentials: PrivyCredentials
): Promise<{ data: PrivyWallet[] }> {
  return privyFetch<{ data: PrivyWallet[] }>("/v1/wallets", credentials);
}

export async function createPrivyWallet(
  credentials: PrivyCredentials,
  chainType = "ethereum"
): Promise<PrivyWallet> {
  return privyFetch<PrivyWallet>("/v1/wallets", credentials, {
    method: "POST",
    body: JSON.stringify({ chain_type: chainType }),
  });
}

export async function getPrivyWallet(
  walletId: string,
  credentials: PrivyCredentials
): Promise<PrivyWallet> {
  return privyFetch<PrivyWallet>(`/v1/wallets/${walletId}`, credentials);
}

export async function getPrivyWalletByAddress(
  address: string,
  credentials: PrivyCredentials
): Promise<{ data: PrivyWallet[] }> {
  const params = new URLSearchParams({ address });
  return privyFetch<{ data: PrivyWallet[] }>(`/v1/wallets?${params}`, credentials);
}

export async function getPrivyWalletBalance(
  walletId: string,
  credentials: PrivyCredentials,
  asset = "eth"
): Promise<Record<string, unknown>> {
  return privyFetch<Record<string, unknown>>(
    `/v1/wallets/${walletId}/balance?asset=${encodeURIComponent(asset)}`,
    credentials
  );
}

export async function getPrivyWalletTransaction(
  walletId: string,
  transactionId: string,
  credentials: PrivyCredentials
): Promise<Record<string, unknown>> {
  return privyFetch<Record<string, unknown>>(
    `/v1/wallets/${walletId}/transactions/${transactionId}`,
    credentials
  );
}

export async function createPrivyKeyQuorum(
  credentials: PrivyCredentials,
  input: {
    displayName: string;
    authorizationThreshold: number;
    userIds?: string[];
    publicKeys?: string[];
    keyQuorumIds?: string[];
  }
): Promise<PrivyKeyQuorum> {
  return privyFetch<PrivyKeyQuorum>("/v1/key_quorums", credentials, {
    method: "POST",
    body: JSON.stringify({
      display_name: input.displayName,
      authorization_threshold: input.authorizationThreshold,
      user_ids: input.userIds,
      public_keys: input.publicKeys,
      key_quorum_ids: input.keyQuorumIds,
    }),
  });
}

export async function getPrivyKeyQuorum(
  quorumId: string,
  credentials: PrivyCredentials
): Promise<PrivyKeyQuorum> {
  return privyFetch<PrivyKeyQuorum>(
    `/v1/key_quorums/${encodeURIComponent(quorumId)}`,
    credentials
  );
}

export async function createPrivyPolicy(
  credentials: PrivyCredentials,
  input: {
    name: string;
    chainType?: string;
    rules: Record<string, unknown>[];
    ownerId?: string;
  }
): Promise<PrivyPolicy> {
  return privyFetch<PrivyPolicy>("/v1/policies", credentials, {
    method: "POST",
    body: JSON.stringify({
      version: "1.0",
      name: input.name,
      chain_type: input.chainType ?? "ethereum",
      rules: input.rules,
      owner_id: input.ownerId,
    }),
  });
}

export async function getPrivyPolicy(
  policyId: string,
  credentials: PrivyCredentials
): Promise<PrivyPolicy> {
  return privyFetch<PrivyPolicy>(
    `/v1/policies/${encodeURIComponent(policyId)}`,
    credentials
  );
}

export async function privyWalletTransfer(
  walletId: string,
  body: WalletTransferRequest,
  credentials: PrivyCredentials
): Promise<PrivyWalletAction> {
  return privyFetch<PrivyWalletAction>(`/v1/wallets/${walletId}/transfer`, credentials, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function privyWalletSwap(
  walletId: string,
  body: Record<string, unknown>,
  credentials: PrivyCredentials
): Promise<PrivyWalletAction> {
  return privyFetch<PrivyWalletAction>(`/v1/wallets/${walletId}/swap`, credentials, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPrivyTransferIntent(
  walletId: string,
  body: WalletTransferRequest,
  credentials: PrivyCredentials
): Promise<PrivyIntent> {
  return privyFetch<PrivyIntent>(
    `/v1/intents/wallets/${walletId}/transfer`,
    credentials,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function createPrivyRpcIntent(
  walletId: string,
  body: Record<string, unknown>,
  credentials: PrivyCredentials
): Promise<PrivyIntent> {
  return privyFetch<PrivyIntent>(
    `/v1/intents/wallets/${walletId}/rpc`,
    credentials,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function getPrivyIntent(
  intentId: string,
  credentials: PrivyCredentials
): Promise<PrivyIntent & Record<string, unknown>> {
  return privyFetch<PrivyIntent & Record<string, unknown>>(
    `/v1/intents/${intentId}`,
    credentials
  );
}

export async function listPrivyIntents(
  credentials: PrivyCredentials,
  walletId?: string
): Promise<{ data: Array<PrivyIntent & Record<string, unknown>> }> {
  const params = walletId ? `?wallet_id=${encodeURIComponent(walletId)}` : "";
  return privyFetch<{ data: Array<PrivyIntent & Record<string, unknown>> }>(
    `/v1/intents${params}`,
    credentials
  );
}

export async function walletRpc(
  walletId: string,
  body: Record<string, unknown>,
  credentials: PrivyCredentials
): Promise<{ method: string; data: Record<string, unknown> }> {
  return privyFetch<{ method: string; data: Record<string, unknown> }>(
    `/v1/wallets/${walletId}/rpc`,
    credentials,
    { method: "POST", body: JSON.stringify(body) }
  );
}
