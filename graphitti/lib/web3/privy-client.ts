import "server-only";

import {
  createPrivyAuthorizationSignature,
  needsAuthorizationSignature,
} from "@/lib/web3/privy-authorization";
import {
  buildIntentAuthorizationSignInput,
  type IntentAuthorizationSignInput,
  signIntentAuthorizationPayload,
} from "@/lib/web3/privy-intent-authorize";

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

export type PrivyOrganization = {
  id: string;
  display_name: string;
  default_key_quorum_id: string;
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
  if (!(appId && appSecret)) {
    throw new Error(
      "PRIVY_APP_ID and PRIVY_APP_SECRET must be configured to call Privy."
    );
  }
  return { appId, appSecret };
}

function basicAuthHeader(appId: string, appSecret: string): string {
  return `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`;
}

function extraPrivyHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const extra: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (
      normalized.startsWith("privy-") &&
      normalized !== "privy-app-id" &&
      normalized !== "privy-authorization-signature" &&
      normalized !== "privy-authorization-key"
    ) {
      extra[normalized] = value;
    }
  }
  return extra;
}

function mergePrivyHeaders(
  init: RequestInit,
  appId: string,
  appSecret: string
): Record<string, string> {
  const incoming = (init.headers as Record<string, string> | undefined) ?? {};
  const withoutKey: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (key.toLowerCase() !== "privy-authorization-key") {
      withoutKey[key] = value;
    }
  }
  return {
    Authorization: basicAuthHeader(appId, appSecret),
    "privy-app-id": appId,
    "Content-Type": "application/json",
    ...withoutKey,
  };
}

function readPrivyErrorMessage(body: unknown, status: number): string {
  if (typeof body === "object" && body) {
    if (
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
    if (
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
  }
  return `Privy HTTP ${status}`;
}

function withAuthorizationSignature(input: {
  headers: Record<string, string>;
  method: string;
  path: string;
  body: BodyInit | null | undefined;
  appId: string;
}): Record<string, string> {
  if (
    !needsAuthorizationSignature(input.method, input.path) ||
    input.headers["privy-authorization-signature"]
  ) {
    return input.headers;
  }

  const authorizationKey = process.env.PRIVY_AUTHORIZATION_KEY?.trim();
  if (!authorizationKey) {
    throw new Error(
      "PRIVY_AUTHORIZATION_KEY is required to sign Privy wallet actions. Add the authorization private key from the Privy dashboard."
    );
  }

  return {
    ...input.headers,
    "privy-authorization-signature": createPrivyAuthorizationSignature({
      method: input.method,
      path: input.path,
      body: input.body,
      appId: input.appId,
      authorizationKey,
      extraPrivyHeaders: extraPrivyHeaders(input.headers),
    }),
  };
}

export async function privyFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { appId, appSecret } = getAppCredentials();
  const method = (init.method ?? "GET").toUpperCase();
  const headers = withAuthorizationSignature({
    headers: mergePrivyHeaders(init, appId, appSecret),
    method,
    path,
    body: init.body,
    appId,
  });

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
    throw new Error(readPrivyErrorMessage(body, response.status));
  }

  return body as T;
}

export async function getPrivyUser(privyUserId: string): Promise<PrivyUser> {
  return await privyFetch<PrivyUser>(
    `/v1/users/${encodeURIComponent(privyUserId)}`
  );
}

export async function listPrivyWallets(): Promise<{ data: PrivyWallet[] }> {
  return await privyFetch<{ data: PrivyWallet[] }>("/v1/wallets");
}

export async function createPrivyWallet(
  chainType = "ethereum"
): Promise<PrivyWallet> {
  return await privyFetch<PrivyWallet>("/v1/wallets", {
    method: "POST",
    body: JSON.stringify({ chain_type: chainType }),
  });
}

export async function getPrivyWallet(walletId: string): Promise<PrivyWallet> {
  return await privyFetch<PrivyWallet>(`/v1/wallets/${walletId}`);
}

export async function getPrivyWalletTransaction(
  walletId: string,
  transactionId: string
): Promise<Record<string, unknown>> {
  return await privyFetch<Record<string, unknown>>(
    `/v1/wallets/${walletId}/transactions/${transactionId}`
  );
}

export function getPrivyAppId(): string | undefined {
  return process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
}

export function getPrivyOperatorSignerId(): string | undefined {
  return (
    process.env.PRIVY_OPERATOR_SIGNER_ID?.trim() ||
    process.env.NEXT_PUBLIC_PRIVY_SIGNER_ID?.trim()
  );
}

export async function createPrivyKeyQuorum(input: {
  displayName: string;
  authorizationThreshold: number;
  userIds?: string[];
  publicKeys?: string[];
  keyQuorumIds?: string[];
}): Promise<PrivyKeyQuorum> {
  const body: Record<string, unknown> = {
    display_name: input.displayName,
    authorization_threshold: input.authorizationThreshold,
  };
  if (input.userIds && input.userIds.length > 0) {
    body.user_ids = input.userIds;
  }
  if (input.publicKeys && input.publicKeys.length > 0) {
    body.public_keys = input.publicKeys;
  }
  if (input.keyQuorumIds && input.keyQuorumIds.length > 0) {
    body.key_quorum_ids = input.keyQuorumIds;
  }

  return await privyFetch<PrivyKeyQuorum>("/v1/key_quorums", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPrivyPolicy(input: {
  name: string;
  chainType?: string;
  rules: Record<string, unknown>[];
  ownerId?: string;
}): Promise<PrivyPolicy> {
  return await privyFetch<PrivyPolicy>("/v1/policies", {
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

export async function updatePrivyPolicy(
  policyId: string,
  input: {
    name?: string;
    rules: Record<string, unknown>[];
  }
): Promise<PrivyPolicy> {
  return await privyFetch<PrivyPolicy>(`/v1/policies/${policyId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: input.name,
      rules: input.rules,
    }),
  });
}

export async function createPrivyOrganization(input: {
  displayName: string;
  defaultKeyQuorumId: string;
}): Promise<PrivyOrganization> {
  return await privyFetch<PrivyOrganization>("/v1/organizations", {
    method: "POST",
    body: JSON.stringify({
      display_name: input.displayName,
      default_key_quorum_id: input.defaultKeyQuorumId,
    }),
  });
}

export async function archivePrivyWallet(
  walletId: string
): Promise<PrivyWallet> {
  return await privyFetch<PrivyWallet>(`/v1/wallets/${walletId}/archive`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function createPrivyOrgWallet(input: {
  ownerId: string;
  policyIds: string[];
  additionalSigners?: Array<{
    signer_id: string;
    override_policy_ids?: string[];
  }>;
  privyOrganizationId?: string;
}): Promise<PrivyWallet> {
  return await privyFetch<PrivyWallet>("/v1/wallets", {
    method: "POST",
    body: JSON.stringify({
      chain_type: "ethereum",
      owner_id: input.ownerId,
      policy_ids: input.policyIds,
      additional_signers: input.additionalSigners?.map((signer) => ({
        signer_id: signer.signer_id,
        override_policy_ids: signer.override_policy_ids,
      })),
      ...(input.privyOrganizationId
        ? { entity: { type: "organization", id: input.privyOrganizationId } }
        : {}),
    }),
  });
}

export type WalletTransferRequest = {
  source: {
    chain: string;
    asset: string;
    amount?: string;
  };
  destination: {
    address: string;
    chain?: string;
    asset?: string;
  };
  amount?: string;
  amount_type?: "exact_input" | "exact_output";
  reference_id?: string;
  nonce?: string;
};

export async function privyWalletTransfer(
  walletId: string,
  body: WalletTransferRequest
): Promise<PrivyWalletAction> {
  return await privyFetch<PrivyWalletAction>(
    `/v1/wallets/${walletId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function privyWalletSwap(
  walletId: string,
  body: Record<string, unknown>
): Promise<PrivyWalletAction> {
  return await privyFetch<PrivyWalletAction>(`/v1/wallets/${walletId}/swap`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPrivyTransferIntent(
  walletId: string,
  body: WalletTransferRequest
): Promise<PrivyIntent> {
  return await privyFetch<PrivyIntent>(
    `/v1/intents/wallets/${walletId}/transfer`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function getPrivyIntent(
  intentId: string
): Promise<PrivyIntent & Record<string, unknown>> {
  return await privyFetch<PrivyIntent & Record<string, unknown>>(
    `/v1/intents/${intentId}`
  );
}

export type AuthorizePrivyIntentInput = {
  signature: string;
  timestamp: number;
};

export async function authorizePrivyIntent(
  intentId: string,
  input: AuthorizePrivyIntentInput
): Promise<PrivyIntent & Record<string, unknown>> {
  const encodedId = encodeURIComponent(intentId);
  return await privyFetch<PrivyIntent & Record<string, unknown>>(
    `/v1/intents/${encodedId}/authorize`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function rejectPrivyIntent(
  intentId: string
): Promise<PrivyIntent & Record<string, unknown>> {
  const encodedId = encodeURIComponent(intentId);
  return await privyFetch<PrivyIntent & Record<string, unknown>>(
    `/v1/intents/${encodedId}/reject`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

/**
 * Authorize a pending intent. Prefer passing the org owner's authorization
 * signature from the client (Treasury UI). Falls back to PRIVY_AUTHORIZATION_KEY
 * when no user signature is supplied (key-quorum owners only).
 */
export async function signPrivyIntent(
  intentId: string,
  userAuthorization?: AuthorizePrivyIntentInput
): Promise<PrivyIntent & Record<string, unknown>> {
  if (userAuthorization) {
    return await authorizePrivyIntent(intentId, userAuthorization);
  }

  const intent = await getPrivyIntent(intentId);
  const requestDetails = intent.request_details as
    | { method: string; url: string; body: unknown }
    | undefined;
  if (!(requestDetails?.url && requestDetails.method)) {
    throw new Error("Intent is missing request_details required for approval");
  }

  const { appId } = getAppCredentials();
  const signInput = buildIntentAuthorizationSignInput(
    intent.intent_id ?? intentId,
    requestDetails,
    appId
  );

  const authorizationKey = process.env.PRIVY_AUTHORIZATION_KEY?.trim();
  if (!authorizationKey) {
    throw new Error(
      "Connect with Privy and approve again, or configure PRIVY_AUTHORIZATION_KEY for server-side intent approval."
    );
  }

  const signature = signIntentAuthorizationPayload(signInput, authorizationKey);
  return await authorizePrivyIntent(intentId, {
    signature,
    timestamp: signInput.timestamp,
  });
}

export async function getPrivyIntentAuthorizationSignInput(
  intentId: string
): Promise<IntentAuthorizationSignInput> {
  const intent = await getPrivyIntent(intentId);
  const requestDetails = intent.request_details as
    | { method: string; url: string; body: unknown }
    | undefined;
  if (!(requestDetails?.url && requestDetails.method)) {
    throw new Error("Intent is missing request_details required for approval");
  }

  const { appId } = getAppCredentials();
  return buildIntentAuthorizationSignInput(
    intent.intent_id ?? intentId,
    requestDetails,
    appId
  );
}

export async function getPrivyWalletAction(
  walletId: string,
  actionId: string
): Promise<PrivyWalletAction & Record<string, unknown>> {
  return await privyFetch<PrivyWalletAction & Record<string, unknown>>(
    `/v1/wallets/${walletId}/actions/${actionId}`
  );
}
