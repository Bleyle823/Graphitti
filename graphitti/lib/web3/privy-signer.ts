import "server-only";

import { toCaip2, type SupportedChain } from "./chains";
import { privyFetch } from "./privy-client";

type RpcSuccess = {
  method: string;
  data: { hash?: string; signature?: string; encoding?: string };
};

export type SendSponsoredTxInput = {
  walletId: string;
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
  sponsor?: boolean;
};

export async function sendSponsoredTransaction(
  input: SendSponsoredTxInput
): Promise<{ hash: string }> {
  const result = await privyFetch<RpcSuccess>(
    `/v1/wallets/${input.walletId}/rpc`,
    {
      method: "POST",
      body: JSON.stringify({
        method: "eth_sendTransaction",
        caip2: toCaip2(input.chain),
        sponsor: input.sponsor ?? true,
        params: {
          transaction: {
            to: input.to,
            value: input.value ?? "0x0",
            data: input.data ?? "0x",
          },
        },
      }),
    }
  );

  const hash = result.data?.hash;
  if (!hash) {
    throw new Error("Privy did not return a transaction hash");
  }
  return { hash };
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
