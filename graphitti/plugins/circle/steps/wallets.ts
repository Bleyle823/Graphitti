import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { CircleCredentials } from "../credentials";
import {
  circleApi,
  entitySecretCiphertext,
  newIdempotencyKey,
  requireApiKey,
} from "../shared";

export type WalletInput = StepInput & {
  integrationId?: string;
  name?: string;
  walletSetId?: string;
  walletId?: string;
  blockchain?: string;
  count?: string;
  accountType?: string;
  destinationAddress?: string;
  amount?: string;
  tokenId?: string;
  tokenAddress?: string;
  transactionId?: string;
  typedData?: string;
  pageSize?: string;
};

async function creds(input: WalletInput): Promise<CircleCredentials> {
  return input.integrationId ? await fetchCredentials(input.integrationId) : {};
}

async function createWalletSet(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  return circleApi({
    path: "/v1/w3s/developer/walletSets",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      name: input.name || "Graphitti wallet set",
    },
  });
}

async function createWallet(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.walletSetId || !input.blockchain) {
    return fail("walletSetId and blockchain are required");
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  return circleApi({
    path: "/v1/w3s/developer/wallets",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      walletSetId: input.walletSetId,
      blockchains: [input.blockchain],
      accountType: input.accountType || "EOA",
      count: Number(input.count || "1"),
    },
  });
}

async function getWallet(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.walletId) {
    return fail("walletId is required");
  }
  return circleApi({
    path: `/v1/w3s/wallets/${encodeURIComponent(input.walletId)}`,
    apiKey: key.apiKey,
  });
}

async function listWallets(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  const params = new URLSearchParams();
  if (input.walletSetId) {
    params.set("walletSetId", input.walletSetId);
  }
  if (input.blockchain) {
    params.set("blockchain", input.blockchain);
  }
  params.set("pageSize", input.pageSize || "20");
  const query = params.toString();
  return circleApi({
    path: `/v1/w3s/wallets${query ? `?${query}` : ""}`,
    apiKey: key.apiKey,
  });
}

async function listBalances(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.walletId) {
    return fail("walletId is required");
  }
  return circleApi({
    path: `/v1/w3s/wallets/${encodeURIComponent(input.walletId)}/balances`,
    apiKey: key.apiKey,
  });
}

async function createTransfer(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.walletId || !input.destinationAddress || !input.amount) {
    return fail("walletId, destinationAddress, and amount are required");
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  return circleApi({
    path: "/v1/w3s/developer/transactions/transfer",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      walletId: input.walletId,
      destinationAddress: input.destinationAddress,
      amounts: [input.amount],
      ...(input.tokenId ? { tokenId: input.tokenId } : {}),
      ...(input.tokenAddress ? { tokenAddress: input.tokenAddress } : {}),
      feeLevel: "MEDIUM",
    },
  });
}

async function getTransaction(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.transactionId) {
    return fail("transactionId is required");
  }
  return circleApi({
    path: `/v1/w3s/transactions/${encodeURIComponent(input.transactionId)}`,
    apiKey: key.apiKey,
  });
}

async function signTypedData(input: WalletInput) {
  const credentials = await creds(input);
  const key = requireApiKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.walletId || !input.typedData) {
    return fail("walletId and typedData are required");
  }
  const secret = await entitySecretCiphertext(credentials);
  if (!secret.success) {
    return secret;
  }
  let data: unknown = input.typedData;
  try {
    data = JSON.parse(input.typedData);
  } catch {
    data = input.typedData;
  }
  return circleApi({
    path: "/v1/w3s/developer/sign/typedData",
    apiKey: key.apiKey,
    method: "POST",
    body: {
      idempotencyKey: newIdempotencyKey(),
      entitySecretCiphertext: secret.ciphertext,
      walletId: input.walletId,
      data,
    },
  });
}

export async function createWalletSetStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => createWalletSet(input));
}

export async function createWalletStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => createWallet(input));
}

export async function getWalletStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => getWallet(input));
}

export async function listWalletsStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => listWallets(input));
}

export async function listBalancesStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => listBalances(input));
}

export async function createTransferStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => createTransfer(input));
}

export async function getTransactionStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => getTransaction(input));
}

export async function signTypedDataStep(input: WalletInput) {
  "use step";
  return withStepLogging(input, () => signTypedData(input));
}

export const _integrationType = "circle";
