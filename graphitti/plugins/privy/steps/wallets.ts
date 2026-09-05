import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  createPrivyWallet,
  getPrivyWallet,
  getPrivyWalletTransaction,
  listPrivyWallets,
} from "@/lib/web3/privy-client";
import { applyPrivyCredentials } from "../credentials";

type PrivyStepInput = StepInput & {
  integrationId?: string;
};

export type ListWalletsInput = PrivyStepInput;

export type CreateWalletInput = PrivyStepInput & {
  chainType?: string;
};

export type GetWalletInput = PrivyStepInput & {
  walletId: string;
};

export type GetTransactionInput = PrivyStepInput & {
  walletId: string;
  transactionId: string;
};

async function requirePrivyAuth(input: PrivyStepInput) {
  const fetched = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};
  return applyPrivyCredentials(fetched);
}

async function listWallets(input: ListWalletsInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  try {
    const result = await listPrivyWallets();
    return ok({ wallets: result.data });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function createWallet(input: CreateWalletInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  try {
    const wallet = await createPrivyWallet(input.chainType || "ethereum");
    return ok({
      id: wallet.id,
      address: wallet.address,
      chain_type: wallet.chain_type,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getWallet(input: GetWalletInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!input.walletId) {
    return fail("walletId is required");
  }
  try {
    const wallet = await getPrivyWallet(input.walletId);
    return ok({
      id: wallet.id,
      address: wallet.address,
      chain_type: wallet.chain_type,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getTransaction(input: GetTransactionInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!(input.walletId && input.transactionId)) {
    return fail("walletId and transactionId are required");
  }
  try {
    const transaction = await getPrivyWalletTransaction(
      input.walletId,
      input.transactionId
    );
    return ok({ transaction });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function listWalletsStep(input: ListWalletsInput) {
  "use step";
  return withStepLogging(input, () => listWallets(input));
}

export async function createWalletStep(input: CreateWalletInput) {
  "use step";
  return withStepLogging(input, () => createWallet(input));
}

export async function getWalletStep(input: GetWalletInput) {
  "use step";
  return withStepLogging(input, () => getWallet(input));
}

export async function getTransactionStep(input: GetTransactionInput) {
  "use step";
  return withStepLogging(input, () => getTransaction(input));
}

export const _integrationType = "privy";
