import "server-only";

import { ethers } from "ethers";
import { logWarn } from "@/lib/logging";
import type { SupportedChain } from "./chains";
import { getPrivyWallet, privyFetch } from "./privy-client";

const GAS_LIMIT_BUFFER_NUMERATOR = BigInt(12);
const GAS_LIMIT_BUFFER_DENOMINATOR = BigInt(10);

export type RawTransactionInput = {
  walletId: string;
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
};

async function signHash(
  walletId: string,
  hash: string
): Promise<ethers.Signature> {
  const result = await privyFetch<{ data?: { signature?: string } }>(
    `/v1/wallets/${walletId}/rpc`,
    {
      method: "POST",
      body: JSON.stringify({
        method: "secp256k1_sign",
        params: { hash },
      }),
    }
  );

  const signature = result.data?.signature;
  if (!signature) {
    throw new Error("Privy did not return a signature for the transaction");
  }
  return ethers.Signature.from(signature);
}

function resolveFees(
  feeData: ethers.FeeData,
  chain: SupportedChain
): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } {
  const floor = chain.minMaxFeePerGasWei ?? BigInt(0);
  const suggested =
    feeData.maxFeePerGas ?? feeData.gasPrice ?? chain.minMaxFeePerGasWei;
  if (!suggested) {
    throw new Error(`${chain.label} RPC did not return a gas price`);
  }

  const maxFeePerGas = suggested > floor ? suggested : floor;
  const priority = feeData.maxPriorityFeePerGas ?? BigInt(0);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas: priority > maxFeePerGas ? maxFeePerGas : priority,
  };
}

const NONCE_CONSUMED_TIMEOUT_MS = 15_000;
const NONCE_CONSUMED_POLL_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Hold the per-wallet send lock until the RPC's pending nonce moves past the
 * nonce we just broadcast. Otherwise a sibling Arc send can still read the
 * same nonce and fail with "replacement fee too low".
 */
async function waitUntilPendingNonceConsumed(
  provider: ethers.JsonRpcProvider,
  address: string,
  usedNonce: number,
  chainLabel: string
): Promise<void> {
  const deadline = Date.now() + NONCE_CONSUMED_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const pending = await provider.getTransactionCount(address, "pending");
    if (pending > usedNonce) {
      return;
    }
    await delay(NONCE_CONSUMED_POLL_MS);
  }

  logWarn("[Privy] Pending nonce did not advance after broadcast", {
    chain: chainLabel,
    used_nonce: String(usedNonce),
  });
}

/**
 * Sign a transaction with Privy's raw-hash endpoint and broadcast it through the
 * chain's own RPC.
 *
 * Privy gates `eth_sendTransaction` to the chains enabled for the app, so chains
 * it does not broadcast for (Arc testnet) would otherwise be unreachable even
 * though the wallet key itself can sign for them.
 */
export async function sendRawTransaction(
  input: RawTransactionInput
): Promise<{ hash: string }> {
  const wallet = await getPrivyWallet(input.walletId);

  // Privy enforces wallet policies on eth_sendTransaction, not on raw hash
  // signing. Broadcasting a policy-governed wallet this way would skip the
  // spend and payee rules attached to it, so require the chain be enabled.
  if (wallet.policy_ids && wallet.policy_ids.length > 0) {
    throw new Error(
      `${input.chain.label} is not enabled for this Privy app, and this wallet has Privy policies that only apply to Privy-broadcast transactions. Enable ${input.chain.label} (${input.chain.chainId}) for the app in the Privy dashboard.`
    );
  }

  const provider = new ethers.JsonRpcProvider(
    input.chain.rpcUrl,
    input.chain.chainId,
    { staticNetwork: true }
  );

  try {
    const request = {
      from: wallet.address,
      to: input.to,
      data: input.data ?? "0x",
      value: input.value ?? "0x0",
    };

    const [nonce, feeData, estimatedGas] = await Promise.all([
      provider.getTransactionCount(wallet.address, "pending"),
      provider.getFeeData(),
      provider.estimateGas(request),
    ]);

    const { maxFeePerGas, maxPriorityFeePerGas } = resolveFees(
      feeData,
      input.chain
    );

    const transaction = ethers.Transaction.from({
      type: 2,
      chainId: input.chain.chainId,
      to: input.to,
      data: request.data,
      value: request.value,
      nonce,
      gasLimit:
        (estimatedGas * GAS_LIMIT_BUFFER_NUMERATOR) /
        GAS_LIMIT_BUFFER_DENOMINATOR,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    const signature = await signHash(input.walletId, transaction.unsignedHash);
    if (
      ethers
        .recoverAddress(transaction.unsignedHash, signature)
        .toLowerCase() !== wallet.address.toLowerCase()
    ) {
      throw new Error(
        "Privy signature does not match the wallet address; transaction not broadcast"
      );
    }
    transaction.signature = signature;

    const response = await provider.broadcastTransaction(
      transaction.serialized
    );
    await waitUntilPendingNonceConsumed(
      provider,
      wallet.address,
      nonce,
      input.chain.label
    );
    return { hash: response.hash };
  } finally {
    provider.destroy();
  }
}
