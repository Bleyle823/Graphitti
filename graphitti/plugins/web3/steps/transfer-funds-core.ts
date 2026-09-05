import "server-only";

import { ethers } from "ethers";
import { parseUnits, requireChain } from "@/lib/web3/chains";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage } from "@/lib/utils";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type TransferFundsCoreInput = {
  network: string;
  amount: string;
  recipientAddress: string;
  gasLimitMultiplier?: string;
  usePrivateMempool?: boolean;
  strict?: boolean;
  web3Connection?: string;
  _context?: {
    executionId?: string;
    organizationId?: string;
    workflowId?: string;
  };
};

export type TransferFundsCoreResult =
  | {
      success: true;
      transactionHash: string;
      transactionLink?: string;
      amount: string;
      recipient: string;
    }
  | {
      success: false;
      error: string;
      errorClass?: ExecutionErrorType;
    };

export type TransferFundsResult = TransferFundsCoreResult;

export async function transferFundsCore(
  input: TransferFundsCoreInput
): Promise<TransferFundsCoreResult> {
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
    const value = `0x${parseUnits(input.amount, chain.nativeDecimals).toString(16)}`;
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: input.recipientAddress,
      value,
    });
    return {
      success: true,
      transactionHash: hash,
      transactionLink: `${chain.explorerUrl}/tx/${hash}`,
      amount: input.amount,
      recipient: input.recipientAddress,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
