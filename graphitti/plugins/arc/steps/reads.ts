import "server-only";

import { resolveArcNetworkId } from "@/lib/arc/app-kit-flows";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { decodeUint, encodeBalanceOf } from "@/lib/web3/abi";
import { formatUnits, NETWORK_SELECT_OPTIONS, requireChain } from "@/lib/web3/chains";
import {
  ethCall,
  ethGetBalance,
  ethGetBlockNumber,
  ethGetLogs,
  ethGetTransactionReceipt,
} from "@/lib/web3/rpc";
import {
  CHAINS,
  getArcAddresses,
  getArcConfig,
  getCircleSwapQuote,
  requireCircleKey,
} from "../shared";

export type ReadInput = StepInput & {
  integrationId?: string;
  network?: string;
  address?: string;
  txHash?: string;
  fromBlock?: string;
  toBlock?: string;
  operation?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
};

function arcId(input: ReadInput) {
  return resolveArcNetworkId(input.network);
}

async function getConfig(input: ReadInput) {
  return ok(getArcConfig(arcId(input)));
}

async function listGenesis(input: ReadInput) {
  const chain = requireChain(arcId(input));
  const addresses = getArcAddresses(chain.id);
  return ok({
    network: chain.id,
    chainId: chain.chainId,
    cctpDomain: chain.cctpDomain,
    explorer: chain.explorerUrl,
    rpc: chain.rpcUrl,
    addresses,
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
    const network = arcId(input);
    const wei = await ethGetBalance(network, input.address);
    return ok({
      address: input.address,
      network,
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
  const address = input.address.trim();
  if (!address.startsWith("0x") || address.length < 42) {
    return fail(
      "address must be a 0x wallet address. Wire Get org wallet.address into this field."
    );
  }
  try {
    const network = arcId(input);
    const token = getArcAddresses(network).usdcErc20;
    const raw = await ethCall({
      network,
      to: token,
      data: encodeBalanceOf(address),
    });
    const balanceRaw = decodeUint(raw).toString();
    return ok({
      address,
      network,
      tokenAddress: token,
      balanceRaw,
      balance: formatUnits(balanceRaw, 6),
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
    const network = arcId(input);
    const token = getArcAddresses(network).eurcOfficial;
    const raw = await ethCall({
      network,
      to: token,
      data: encodeBalanceOf(input.address),
    });
    return ok({
      address: input.address,
      network,
      tokenAddress: token,
      balanceRaw: decodeUint(raw).toString(),
      balance: formatUnits(raw, 6),
      decimals: 6,
      symbol: "EURC",
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function estimateUsdcGas(input: ReadInput) {
  const network = arcId(input);
  const addresses = getArcAddresses(network);
  const block = await ethGetBlockNumber(network);
  return ok({
    network,
    minMaxFeePerGasWei: addresses.minMaxFeePerGasWei.toString(),
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
    const network = arcId(input);
    for (let i = 0; i < 20; i += 1) {
      const receipt = await ethGetTransactionReceipt(network, input.txHash);
      if (receipt && receipt.status) {
        return ok({
          receipt,
          network,
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
    const network = arcId(input);
    const emitter = getArcAddresses(network).systemEmitter;
    const logs = await ethGetLogs({
      network,
      address: emitter,
      fromBlock: input.fromBlock,
      toBlock: input.toBlock,
    });
    return ok({
      emitter,
      network,
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
  const mainnet = requireChain("arc");
  const testnet = requireChain("arc-testnet");
  return ok({
    operation,
    chains,
    networks: NETWORK_SELECT_OPTIONS,
    arc: {
      chainId: mainnet.chainId,
      domain: mainnet.cctpDomain,
      usdc: getArcAddresses("arc").usdcErc20,
      rpc: mainnet.rpcUrl,
      explorer: mainnet.explorerUrl,
    },
    "arc-testnet": {
      chainId: testnet.chainId,
      domain: testnet.cctpDomain,
      usdc: getArcAddresses("arc-testnet").usdcErc20,
      rpc: testnet.rpcUrl,
      explorer: testnet.explorerUrl,
    },
  });
}

export async function getArcConfigStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => getConfig(input));
}

export async function listGenesisAddressesStep(input: ReadInput) {
  "use step";
  return withStepLogging(input, () => listGenesis(input));
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
  return withStepLogging(input, () => estimateUsdcGas(input));
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
