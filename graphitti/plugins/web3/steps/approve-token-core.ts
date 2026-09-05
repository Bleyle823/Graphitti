import "server-only";

import { ethers } from "ethers";
import { encodeApprove } from "@/lib/web3/abi";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage } from "@/lib/utils";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type ApproveTokenCoreInput = {
  network: string;
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
  decimals?: string;
  _context?: {
    executionId?: string;
    organizationId?: string;
    workflowId?: string;
  };
};

export type ApproveTokenResult =
  | {
      success: true;
      transactionHash: string;
      transactionLink?: string;
      amount: string;
      spender: string;
      tokenAddress: string;
    }
  | {
      success: false;
      error: string;
      errorClass?: ExecutionErrorType;
    };

export function parseTokenAddress(tokenAddress: string): string {
  const trimmed = tokenAddress.trim();
  if (!ethers.isAddress(trimmed)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }
  return ethers.getAddress(trimmed);
}

export async function approveTokenCore(
  input: ApproveTokenCoreInput
): Promise<ApproveTokenResult> {
  let tokenAddress: string;
  let spenderAddress: string;
  try {
    tokenAddress = parseTokenAddress(input.tokenAddress);
    spenderAddress = parseTokenAddress(input.spenderAddress);
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
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
      to: tokenAddress,
      data: encodeApprove(spenderAddress, amount),
    });
    return {
      success: true,
      transactionHash: hash,
      transactionLink: `${chain.explorerUrl}/tx/${hash}`,
      amount: input.amount,
      spender: spenderAddress,
      tokenAddress,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
