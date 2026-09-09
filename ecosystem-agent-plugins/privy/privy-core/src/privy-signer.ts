import { toCaip2, type SupportedChain } from "./chains.js";
import { walletRpc } from "./privy-client.js";
import type { PrivyCredentials } from "./types.js";

export async function sendSponsoredTransaction(input: {
  walletId: string;
  chain: SupportedChain;
  to: string;
  data?: string;
  value?: string;
  credentials: PrivyCredentials;
  sponsor?: boolean;
}): Promise<{ hash: string; gasMode: string }> {
  const result = await walletRpc(
    input.walletId,
    {
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
    },
    input.credentials
  );

  const hash = result.data?.hash || result.data?.user_operation_hash;
  if (typeof hash !== "string" || !hash) {
    throw new Error("Privy did not return a transaction hash");
  }
  return { hash, gasMode: input.sponsor === false ? "user-pays" : "app-pays" };
}

export async function personalSign(input: {
  walletId: string;
  message: string;
  chain: SupportedChain;
  credentials: PrivyCredentials;
}): Promise<{ signature: string }> {
  const result = await walletRpc(
    input.walletId,
    {
      method: "personal_sign",
      caip2: toCaip2(input.chain),
      params: { message: input.message, encoding: "utf-8" },
    },
    input.credentials
  );
  const signature = result.data?.signature;
  if (typeof signature !== "string" || !signature) {
    throw new Error("Privy did not return a signature");
  }
  return { signature };
}

export async function signTypedDataV4(input: {
  walletId: string;
  typedData: unknown;
  chain: SupportedChain;
  credentials: PrivyCredentials;
}): Promise<{ signature: string }> {
  const result = await walletRpc(
    input.walletId,
    {
      method: "eth_signTypedData_v4",
      caip2: toCaip2(input.chain),
      params: { typed_data: input.typedData },
    },
    input.credentials
  );
  const signature = result.data?.signature;
  if (typeof signature !== "string" || !signature) {
    throw new Error("Privy did not return a signature");
  }
  return { signature };
}
