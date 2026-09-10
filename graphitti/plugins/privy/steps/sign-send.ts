import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { assertOrgPayeeAllowed } from "@/lib/privy/payee-guard";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import {
  personalSign,
  sendSponsoredTransaction,
  signTypedDataV4,
} from "@/lib/web3/privy-signer";
import { resolveStepWalletId } from "@/lib/web3/resolve-workflow-wallet";
import { applyPrivyCredentials } from "../credentials";

type PrivyStepInput = StepInput & {
  integrationId?: string;
};

export type SendSponsoredTransactionInput = PrivyStepInput & {
  walletId: string;
  network: string;
  to: string;
  data?: string;
  value?: string;
};

export type SignMessageInput = PrivyStepInput & {
  walletId: string;
  network: string;
  message: string;
};

export type SignTypedDataInput = PrivyStepInput & {
  walletId: string;
  network: string;
  typedData: string;
};

export type TransferInput = PrivyStepInput & {
  walletId: string;
  network: string;
  to: string;
  amount: string;
};

async function requirePrivyAuth(input: PrivyStepInput) {
  const fetched = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};
  return applyPrivyCredentials(fetched);
}

function toHexValue(value: string | undefined, decimals: number): string {
  if (!value || value === "0" || value === "0x0") {
    return "0x0";
  }
  if (value.startsWith("0x")) {
    return value;
  }
  return `0x${parseUnits(value, decimals).toString(16)}`;
}

async function sendSponsored(input: SendSponsoredTransactionInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  if (!(wallet.walletId && input.to)) {
    return fail("walletId and to are required");
  }
  const payeeGate = await assertOrgPayeeAllowed(wallet.walletId, input.to);
  if (!payeeGate.success) {
    return fail(payeeGate.error);
  }
  try {
    const chain = requireChain(input.network);
    const { hash, gasMode, gasAsset } = await sendSponsoredTransaction({
      walletId: wallet.walletId,
      chain,
      to: input.to,
      data: input.data || "0x",
      value: toHexValue(input.value, chain.nativeDecimals),
    });
    return ok({
      hash,
      to: input.to,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
      gasMode,
      gasAsset,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function signMessage(input: SignMessageInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!input.message) {
    return fail("message is required");
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  try {
    const { signature } = await personalSign({
      walletId: wallet.walletId,
      message: input.message,
      chain: requireChain(input.network),
    });
    return ok({ signature });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function signTypedData(input: SignTypedDataInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!input.typedData) {
    return fail("typedData is required");
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  try {
    const parsed = JSON.parse(input.typedData);
    const { signature } = await signTypedDataV4({
      walletId: wallet.walletId,
      typedData: parsed,
      chain: requireChain(input.network),
    });
    return ok({ signature });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function transfer(input: TransferInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  if (!(wallet.walletId && input.to && input.amount)) {
    return fail("walletId, to, and amount are required");
  }
  const payeeGate = await assertOrgPayeeAllowed(wallet.walletId, input.to);
  if (!payeeGate.success) {
    return fail(payeeGate.error);
  }
  try {
    const chain = requireChain(input.network);
    const value = `0x${parseUnits(input.amount, chain.nativeDecimals).toString(16)}`;
    const { hash, gasMode, gasAsset } = await sendSponsoredTransaction({
      walletId: wallet.walletId,
      chain,
      to: input.to,
      value,
    });
    return ok({
      hash,
      to: input.to,
      amount: input.amount,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
      gasMode,
      gasAsset,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function sendSponsoredTransactionStep(
  input: SendSponsoredTransactionInput
) {
  "use step";
  return withStepLogging(input, () => sendSponsored(input));
}

export async function signMessageStep(input: SignMessageInput) {
  "use step";
  return withStepLogging(input, () => signMessage(input));
}

export async function signTypedDataStep(input: SignTypedDataInput) {
  "use step";
  return withStepLogging(input, () => signTypedData(input));
}

export async function transferStep(input: TransferInput) {
  "use step";
  return withStepLogging(input, () => transfer(input));
}

export const _integrationType = "privy";
