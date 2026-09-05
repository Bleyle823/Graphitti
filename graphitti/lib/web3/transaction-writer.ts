import "server-only";

import type { SupportedChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type TransactionWriteRequest = {
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
  executionId?: string;
};

export type TransactionWriteResult =
  | { success: true; hash: string; sponsored: boolean }
  | { success: false; error: string };

/**
 * Privy-backed transaction writer used by write-contract-core and protocol writes.
 */
export async function writeTransaction(
  request: TransactionWriteRequest
): Promise<TransactionWriteResult> {
  const wallet = await requireLinkedWalletForExecution(request.executionId);
  if (!wallet.success) {
    return { success: false, error: wallet.error.message };
  }

  try {
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain: request.chain,
      to: request.to,
      data: request.data,
      value: request.value,
    });
    return { success: true, hash, sponsored: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}
