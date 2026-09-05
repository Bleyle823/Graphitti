import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeTransfer } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import { ARC_ADDRESSES, tokenAddress } from "../shared";

export type SendInput = StepInput & {
  token?: string;
  tokenAddress?: string;
  to?: string;
  amount?: string;
};

async function sendOnArc(input: SendInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.to || !input.amount) {
    return fail("to and amount are required");
  }
  try {
    const chain = requireChain("arc-testnet");
    const symbol = input.token || "USDC";
    if (symbol === "USDC" && !input.tokenAddress) {
      const value = `0x${parseUnits(input.amount, 18).toString(16)}`;
      const { hash } = await sendSponsoredTransaction({
        walletId: wallet.wallet.privyWalletId,
        chain,
        to: input.to,
        value,
      });
      return ok({
        hash,
        token: "USDC",
        kind: "native",
        decimals: 18,
        explorer: `${chain.explorerUrl}/tx/${hash}`,
      });
    }
    const token = input.tokenAddress || tokenAddress(symbol);
    if (!token) {
      return fail("Pass tokenAddress for cirBTC or an ERC-20");
    }
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: token,
      data: encodeTransfer(input.to, parseUnits(input.amount, 6)),
    });
    return ok({
      hash,
      token: symbol,
      tokenAddress: token,
      kind: "erc20",
      decimals: 6,
      explorer: `${chain.explorerUrl}/tx/${hash}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function estimateSend(input: SendInput) {
  if (!input.to || !input.amount) {
    return fail("to and amount are required");
  }
  return ok({
    to: input.to,
    amount: input.amount,
    token: input.token || "USDC",
    maxFeePerGasWei: ARC_ADDRESSES.minMaxFeePerGasWei.toString(),
    note: "Arc gas is USDC. Floor maxFeePerGas is 20 Gwei.",
  });
}

export async function sendOnArcStep(input: SendInput) {
  "use step";
  return withStepLogging(input, () => sendOnArc(input));
}

export async function estimateSendStep(input: SendInput) {
  "use step";
  return withStepLogging(input, () => estimateSend(input));
}

export const _integrationType = "arc";
