import "server-only";

import { logWarn } from "@/lib/logging";
import { type SupportedChain, toCaip2 } from "./chains";
import { privyFetch } from "./privy-client";
import { getPrivyGasAttempts, type PrivyGasAttempt } from "./privy-gas";
import { sendRawTransaction } from "./privy-raw-tx";
import { withSerializedWalletSend } from "./wallet-send-lock";

type RpcSuccess = {
  method: string;
  data: {
    hash?: string;
    user_operation_hash?: string;
    signature?: string;
    encoding?: string;
  };
};

export type SendSponsoredTxInput = {
  walletId: string;
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
  /** Override env gas mode; default comes from PRIVY_GAS_MODE / PRIVY_GAS_ASSET */
  sponsor?: boolean;
};

export type SendSponsoredTxResult = {
  hash: string;
  /** True when Privy sponsorship / paymaster was requested */
  sponsored: boolean;
  /** user-pays | app-pays */
  gasMode: string;
  /** Asset used for user-pays gas, if any */
  gasAsset?: string;
};

/**
 * Errors that mean "this gas payment route is unavailable" rather than "this
 * transaction is invalid" — the send is retried on the next route.
 */
const GAS_ROUTE_FAILURE_PATTERNS = [
  "erc20 sponsorship",
  "erc-20 gas sponsorship",
  "no balance of the token",
  "sponsor_options",
  "sponsorship is not enabled",
  "gas sponsorship",
  "gas credits",
  "paymaster",
  "asset is not configured",
  "not configured for",
  "unsupported chain",
  "insufficient balance",
] as const;

/** Privy only broadcasts on chains enabled for the app (Arc is not). */
const CHAIN_NOT_AUTHORIZED_PATTERNS = [
  "not authorized to transact on chain",
  "chain is not supported",
  "unsupported caip2",
] as const;

function matchesAny(message: string, patterns: readonly string[]): boolean {
  const normalized = message.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

async function submitTransaction(input: {
  walletId: string;
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
  attempt: PrivyGasAttempt;
}): Promise<string> {
  const body: Record<string, unknown> = {
    method: "eth_sendTransaction",
    caip2: toCaip2(input.chain),
    sponsor: input.attempt.sponsor,
    params: {
      transaction: {
        to: input.to,
        value: input.value ?? "0x0",
        data: input.data ?? "0x",
      },
    },
  };

  // User-pays: wallet pays gas in USDC (or configured asset); app credits untouched.
  if (input.attempt.sponsorOptions) {
    body.sponsor_options = input.attempt.sponsorOptions;
  }

  const result = await privyFetch<RpcSuccess>(
    `/v1/wallets/${input.walletId}/rpc`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );

  // User-pays ERC-4337 responses may return an empty hash until confirmation,
  // with user_operation_hash available immediately.
  const hash = result.data?.hash || result.data?.user_operation_hash;
  if (!hash) {
    throw new Error("Privy did not return a transaction hash");
  }
  return hash;
}

async function sendSponsoredTransactionUnlocked(
  input: SendSponsoredTxInput
): Promise<SendSponsoredTxResult> {
  const attempts =
    input.sponsor === false
      ? [{ label: "self-pay", sponsor: false } satisfies PrivyGasAttempt]
      : getPrivyGasAttempts(input.chain);

  const failures: string[] = [];

  for (const attempt of attempts) {
    try {
      const hash = await submitTransaction({ ...input, attempt });
      return {
        hash,
        sponsored: attempt.sponsor,
        gasMode: attempt.label,
        gasAsset: attempt.asset,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (matchesAny(message, CHAIN_NOT_AUTHORIZED_PATTERNS)) {
        logWarn("[Privy] Chain not enabled for app; signing and broadcasting", {
          chain: input.chain.id,
        });
        const raw = await sendRawTransaction(input);
        return { hash: raw.hash, sponsored: false, gasMode: "self-pay-raw" };
      }

      failures.push(`${attempt.label}: ${message}`);
      if (!matchesAny(message, GAS_ROUTE_FAILURE_PATTERNS)) {
        throw error;
      }
      logWarn("[Privy] Gas route unavailable, trying next", {
        chain: input.chain.id,
        gas_mode: attempt.label,
      });
    }
  }

  throw new Error(
    `No gas payment route succeeded on ${input.chain.label}. ${failures.join("; ")}`
  );
}

export function sendSponsoredTransaction(
  input: SendSponsoredTxInput
): Promise<SendSponsoredTxResult> {
  return withSerializedWalletSend(input.walletId, input.chain.chainId, () =>
    sendSponsoredTransactionUnlocked(input)
  );
}

export async function personalSign(options: {
  walletId: string;
  message: string;
  chain: SupportedChain;
}): Promise<{ signature: string }> {
  const result = await privyFetch<RpcSuccess>(
    `/v1/wallets/${options.walletId}/rpc`,
    {
      method: "POST",
      body: JSON.stringify({
        method: "personal_sign",
        caip2: toCaip2(options.chain),
        params: {
          message: options.message,
          encoding: "utf-8",
        },
      }),
    }
  );

  const signature = result.data?.signature;
  if (!signature) {
    throw new Error("Privy did not return a signature");
  }
  return { signature };
}

export async function signTypedDataV4(options: {
  walletId: string;
  typedData: unknown;
  chain: SupportedChain;
}): Promise<{ signature: string }> {
  const result = await privyFetch<RpcSuccess>(
    `/v1/wallets/${options.walletId}/rpc`,
    {
      method: "POST",
      body: JSON.stringify({
        method: "eth_signTypedData_v4",
        caip2: toCaip2(options.chain),
        params: {
          typed_data: options.typedData,
        },
      }),
    }
  );

  const signature = result.data?.signature;
  if (!signature) {
    throw new Error("Privy did not return a signature");
  }
  return { signature };
}
