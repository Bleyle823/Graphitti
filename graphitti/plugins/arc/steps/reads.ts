import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { decodeUint, encodeBalanceOf } from "@/lib/web3/abi";
import { formatUnits, NETWORK_SELECT_OPTIONS } from "@/lib/web3/chains";
import {
  ethCall,
  ethGetBalance,
  ethGetBlockNumber,
  ethGetLogs,
  ethGetTransactionReceipt,
} from "@/lib/web3/rpc";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { ARC_ADDRESSES, CHAINS, getArcConfig, getCircleSwapQuote, requireCircleKey } from "../shared";

export type ReadInput = StepInput & {
  integrationId?: string;
  address?: string;
  txHash?: string;
  fromBlock?: string;
  toBlock?: string;
  operation?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
};

async function getConfig() {
  return ok(getArcConfig());
}

async function listGenesis() {
  return ok({
    chainId: 5042002,
    cctpDomain: 26,
    explorer: "https://testnet.arcscan.app",
    rpc: "https://rpc.testnet.arc.network",
    addresses: ARC_ADDRESSES,
    decimals: {
      nativeUsdc: 18,
      usdcErc20: 6,
      eurc: 6,
    },
  });
}

async function nativeUsdc(input: ReadInput) {
  if (!input.address) {
    return fail("address is required");
  }
  try {
    const wei = await ethGetBalance("arc-testnet", input.address);
    return ok({
      address: input.address,
      balanceWei: BigInt(wei).toString(),
      balance: formatUnits(wei, 18),
      decimals: 18,
      symbol: "USDC",
      kind: "native",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function usdcErc20(input: ReadInput) {
  if (!input.address) {
    return fail("address is required");
  }
  try {
    const raw = await ethCall({
      network: "arc-testnet",
      to: ARC_ADDRESSES.usdcErc20,
      data: encodeBalanceOf(input.address),
    });
    return ok({
      address: input.address,
      tokenAddress: ARC_ADDRESSES.usdcErc20,
      balanceRaw: decodeUint(raw).toString(),
      balance: formatUnits(raw, 6),
      decimals: 6,
      symbol: "USDC",
      kind: "erc20",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function eurcBalance(input: ReadInput) {
  if (!input.address) {
    return fail("address is required");
  }
  try {
    const raw = await ethCall({
      network: "arc-testnet",
      to: ARC_ADDRESSES.eurc,
      data: encodeBalanceOf(input.address),
    });
    return ok({
      address: input.address,
      tokenAddress: ARC_ADDRESSES.eurc,
      balanceRaw: decodeUint(raw).toString(),
      balance: formatUnits(raw, 6),
      decimals: 6,
      symbol: "EURC",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function estimateUsdcGas() {
  const block = await ethGetBlockNumber("arc-testnet");
  return ok({
    minMaxFeePerGasWei: ARC_ADDRESSES.minMaxFeePerGasWei.toString(),
    minMaxFeePerGasGwei: "20",
    latestBlock: BigInt(block).toString(),
    note: "Arc gas is native USDC. Use at least 20 Gwei maxFeePerGas.",
  });
}

async function waitFinality(input: ReadInput) {
  if (!input.txHash) {
    return fail("txHash is required");
  }
  try {
    for (let i = 0; i < 20; i += 1) {
      const receipt = await ethGetTransactionReceipt("arc-testnet", input.txHash);
      if (receipt && receipt.status) {
        return ok({
          receipt,
          finalized: receipt.status === "0x1",
        });
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
    }
    return fail("Transaction not finalized yet");
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function decodeSystemEmitter(input: ReadInput) {
  try {
    const logs = await ethGetLogs({
      network: "arc-testnet",
      address: ARC_ADDRESSES.systemEmitter,
      fromBlock: input.fromBlock,
      toBlock: input.toBlock,
    });
    return ok({
      emitter: ARC_ADDRESSES.systemEmitter,
      logs,
      count: logs.length,
      note: "System-emitter USDC transfers use 0xffff...FfE.",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getTokenRates(input: ReadInput) {
  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};
  const key = requireCircleKey(credentials);
  if (!key.success) {
    return key;
  }
  if (!input.fromToken || !input.toToken || !input.amount) {
    return fail("fromToken, toToken, and amount are required");
  }
  const quote = await getCircleSwapQuote({
    apiKey: key.apiKey,
    fromToken: input.fromToken,
    toToken: input.toToken,
    amount: input.amount,
  });
  if (quote.error) {
    return fail(quote.error);
  }
  return ok(quote.data);
}

async function getSupportedChains(input: ReadInput) {
  const operation = input.operation || "bridge";
  const chains = Object.values(CHAINS).map((chain) => ({
    id: chain.id,
    label: chain.label,
    chainId: chain.chainId,
    cctpDomain: chain.cctpDomain,
  }));
  return ok({
    operation,
    chains,
    networks: NETWORK_SELECT_OPTIONS,
    arc: {
      chainId: 5042002,
      domain: 26,
      usdc: ARC_ADDRESSES.usdcErc20,
    },
  });
}

export async function getArcConfigStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => getConfig());
}

export async function listGenesisAddressesStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => listGenesis());
}

export async function getNativeUsdcBalanceStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => nativeUsdc(input));
}

export async function getUsdcErc20BalanceStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => usdcErc20(input));
}

export async function getEurcBalanceStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => eurcBalance(input));
}

export async function estimateUsdcGasStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => estimateUsdcGas());
}

export async function waitFinalityStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => waitFinality(input));
}

export async function decodeSystemEmitterStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => decodeSystemEmitter(input));
}

export async function getTokenRatesStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => getTokenRates(input));
}

export async function getSupportedChainsStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => getSupportedChains(input));
}

export const _integrationType = "arc";
