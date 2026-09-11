import "server-only";

import { type SupportedChain, toCaip2 } from "./chains";
import { privyFetch } from "./privy-client";
import { getPrivyGasConfigForChain } from "./privy-gas";

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

export async function sendSponsoredTransaction(
  input: SendSponsoredTxInput
): Promise<SendSponsoredTxResult> {
  const gas = getPrivyGasConfigForChain(input.chain);
  const sponsor = input.sponsor ?? gas.sponsor;

  const body: Record<string, unknown> = {
    method: "eth_sendTransaction",
    caip2: toCaip2(input.chain),
    sponsor,
    params: {
      transaction: {
        to: input.to,
        value: input.value ?? "0x0",
        data: input.data ?? "0x",
      },
    },
  };

  // User-pays: wallet pays gas in USDC (or configured asset); app credits untouched.
  if (sponsor && gas.sponsorOptions) {
    body.sponsor_options = gas.sponsorOptions;
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

  return {
    hash,
    sponsored: sponsor,
    gasMode: gas.mode,
    gasAsset: gas.sponsorOptions?.asset,
  };
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
