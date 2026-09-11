import "server-only";

import type { SupportedChain } from "@/lib/web3/chains";
import { getPrivyGasConfig } from "@/lib/web3/privy-gas";
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
  | {
      success: true;
      hash: string;
      sponsored: boolean;
      gasMode: string;
      gasAsset?: string;
    }
  | { success: false; error: string };

/**
 * Privy-backed transaction writer used by write-contract-core and protocol writes.
 * Gas mode comes from PRIVY_GAS_MODE / PRIVY_GAS_ASSET (user-pays USDC by default).
 */
export async function writeTransaction(
  request: TransactionWriteRequest
): Promise<TransactionWriteResult> {
  const wallet = await requireLinkedWalletForExecution(request.executionId);
  if (!wallet.success) {
    return { success: false, error: wallet.error.message };
  }

  try {
    const result = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain: request.chain,
      to: request.to,
      data: request.data,
      value: request.value,
    });
    return {
      success: true,
      hash: result.hash,
      sponsored: result.sponsored,
      gasMode: result.gasMode,
      gasAsset: result.gasAsset,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const gas = getPrivyGasConfig();
    if (gas.mode === "user-pays") {
      return {
        success: false,
        error: `${message} (tried paying gas in ${gas.asset.toUpperCase()}, then app gas credits, then the wallet's native balance — fund the wallet or enable a gas mode in the Privy dashboard)`,
      };
    }
    return { success: false, error: message };
  }
}
