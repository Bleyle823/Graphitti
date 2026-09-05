import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { encodeBalanceOf, encodeDecimals, encodeSymbol, decodeUint } from "@/lib/web3/abi";
import { formatUnits, getChain } from "@/lib/web3/chains";
import { ethCall, ethGetBalance } from "@/lib/web3/rpc";

export type BalanceInput = StepInput & {
  network: string;
  address: string;
  tokenAddress?: string;
};

async function nativeHandler(input: BalanceInput) {
  const chain = getChain(input.network);
  if (!chain) {
    return fail(`Unsupported network "${input.network}"`);
  }
  if (!input.address) {
    return fail("Address is required");
  }
  try {
    const wei = await ethGetBalance(input.network, input.address);
    return ok({
      address: input.address,
      balanceWei: BigInt(wei).toString(),
      balance: formatUnits(wei, chain.nativeDecimals),
      symbol: chain.nativeSymbol,
      explorer: `${chain.explorerUrl}/address/${input.address}`,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function tokenHandler(input: BalanceInput) {
  if (!input.address || !input.tokenAddress) {
    return fail("Address and token address are required");
  }
  try {
    const raw = await ethCall({
      network: input.network,
      to: input.tokenAddress,
      data: encodeBalanceOf(input.address),
    });
    let decimals = 18;
    let symbol = "TOKEN";
    try {
      decimals = Number(decodeUint(await ethCall({
        network: input.network,
        to: input.tokenAddress,
        data: encodeDecimals(),
      })));
    } catch {
      decimals = 18;
    }
    try {
      const encoded = await ethCall({
        network: input.network,
        to: input.tokenAddress,
        data: encodeSymbol(),
      });
      const hex = encoded.startsWith("0x") ? encoded.slice(2) : encoded;
      if (hex.length > 128) {
        const offset = Number(BigInt(`0x${hex.slice(0, 64)}`)) * 2;
        const len = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`));
        symbol = Buffer.from(hex.slice(offset + 64, offset + 64 + len * 2), "hex").toString(
          "utf8"
        );
      }
    } catch {
      symbol = "TOKEN";
    }
    const balanceRaw = decodeUint(raw).toString();
    return ok({
      address: input.address,
      tokenAddress: input.tokenAddress,
      balanceRaw,
      balance: formatUnits(raw, decimals),
      decimals,
      symbol,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function checkBalanceStep(input: BalanceInput) {
  "use step";
  return withStepLogging(input, () => nativeHandler(input));
}

export async function checkTokenBalanceStep(input: BalanceInput) {
  "use step";
  return withStepLogging(input, () => tokenHandler(input));
}

export const _integrationType = "web3";
