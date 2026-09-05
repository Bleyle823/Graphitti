import "server-only";

import { ethers } from "ethers";
import { encodeTransfer } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage } from "@/lib/utils";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type TransferTokenCoreInput = {
  network: string;
  tokenAddress: string;
  recipientAddress: string;
  amount: string;
  decimals?: string;
  _context?: {
    executionId?: string;
    organizationId?: string;
    workflowId?: string;
  };
};

export type TransferTokenCoreResult =
  | {
      success: true;
      transactionHash: string;
      transactionLink?: string;
      amount: string;
      recipient: string;
      tokenAddress: string;
    }
  | {
      success: false;
      error: string;
      errorClass?: ExecutionErrorType;
    };

export type TransferTokenResult = TransferTokenCoreResult;

export function parseTokenAddress(tokenAddress: string): string {
  const trimmed = tokenAddress.trim();
  if (!ethers.isAddress(trimmed)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }
  return ethers.getAddress(trimmed);
}

export async function transferTokenCore(
  input: TransferTokenCoreInput
): Promise<TransferTokenCoreResult> {
  if (!ethers.isAddress(input.tokenAddress)) {
    return {
      success: false,
      error: `Invalid token address: ${input.tokenAddress}`,
      errorClass: ExecutionErrorType.USER,
    };
  }
  if (!ethers.isAddress(input.recipientAddress)) {
    return {
      success: false,
      error: `Invalid recipient address: ${input.recipientAddress}`,
      errorClass: ExecutionErrorType.USER,
    };
  }

  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return {
      success: false,
      error: wallet.error.message,
      errorClass: ExecutionErrorType.USER,
    };
  }

  try {
    const chain = requireChain(input.network);
    const decimals = Number(input.decimals || "18");
    const amount = parseUnits(input.amount, decimals);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.tokenAddress,
      data: encodeTransfer(input.recipientAddress, amount),
    });
    return {
      success: true,
      transactionHash: hash,
      transactionLink: `${chain.explorerUrl}/tx/${hash}`,
      amount: input.amount,
      recipient: input.recipientAddress,
      tokenAddress: input.tokenAddress,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
