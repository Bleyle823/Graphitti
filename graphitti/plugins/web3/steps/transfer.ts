import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeTransfer } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type TransferInput = StepInput & {
  network: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  decimals?: string;
};

async function sendNative(input: TransferInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.to || !input.amount) {
    return fail("Recipient and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const value = `0x${parseUnits(input.amount, chain.nativeDecimals).toString(16)}`;
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.to,
      value,
    });
    return ok({
      hash,
      from: wallet.wallet.address,
      to: input.to,
      amount: input.amount,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function sendToken(input: TransferInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.to || !input.amount || !input.tokenAddress) {
    return fail("Recipient, amount, and token address are required");
  }
  try {
    const chain = requireChain(input.network);
    const decimals = Number(input.decimals || "18");
    const amount = parseUnits(input.amount, decimals);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.tokenAddress,
      data: encodeTransfer(input.to, amount),
    });
    return ok({
      hash,
      from: wallet.wallet.address,
      to: input.to,
      tokenAddress: input.tokenAddress,
      amount: input.amount,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function transferNativeStep(input: TransferInput) {
  "use step";
  return withStepLogging(input, () => sendNative(input));
}

export async function transferTokenStep(input: TransferInput) {
  "use step";
  return withStepLogging(input, () => sendToken(input));
}

export const _integrationType = "web3";
