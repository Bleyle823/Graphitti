import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  decodeUint,
  encodeAllowance,
  encodeApprove,
  encodeBalanceOf,
  encodeTransfer,
} from "@/lib/web3/abi";
import { formatUnits, parseUnits, requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { ethCall, ethGetBalance } from "@/lib/web3/rpc";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";
import {
  explorerTx,
  faucetNote,
  lookupToken,
  normalizeCircleNetwork,
  usdcDecimals,
} from "../shared";

export type TokenInput = StepInput & {
  network?: string;
  symbol?: string;
  address?: string;
  tokenAddress?: string;
  to?: string;
  spender?: string;
  owner?: string;
  amount?: string;
};

async function lookup(input: TokenInput) {
  if (!input.network || !input.symbol) {
    return fail("network and symbol are required");
  }
  const symbol = input.symbol === "EURC" ? "EURC" : "USDC";
  const token = lookupToken(symbol, input.network);
  if (!token) {
    return fail(
      `No ${symbol} address for ${input.network}. Do not hardcode; pass tokenAddress on the transfer actions.`
    );
  }
  return ok({
    symbol,
    network: input.network,
    address: token.address,
    decimals: token.decimals,
    nativeDecimals: token.nativeDecimals,
    faucet: faucetNote(),
    note:
      input.network === "arc-testnet" && symbol === "USDC"
        ? "Arc native gas USDC is 18 decimals. The ERC-20 interface at 0x3600...0000 is 6 decimals."
        : undefined,
  });
}

async function balanceOf(input: TokenInput, symbol: "USDC" | "EURC") {
  if (!input.network || !input.address) {
    return fail("network and address are required");
  }
  const network = normalizeCircleNetwork(input.network);
  const address = input.address.trim();
  if (!address.startsWith("0x") || address.length < 42) {
    return fail(
      "address must be a checksummed or lowercase 0x wallet address. Wire Get org wallet.address into this field."
    );
  }
  try {
    if (symbol === "USDC" && network === "arc-testnet" && !input.tokenAddress) {
      const wei = await ethGetBalance(network, address);
      const erc20 = lookupToken("USDC", "arc-testnet");
      let erc20Raw = "0";
      if (erc20) {
        const raw = await ethCall({
          network,
          to: erc20.address,
          data: encodeBalanceOf(address),
        });
        erc20Raw = decodeUint(raw).toString();
      }
      return ok({
        address,
        nativeBalance: formatUnits(wei, 18),
        nativeBalanceWei: BigInt(wei).toString(),
        erc20Balance: formatUnits(erc20Raw, 6),
        erc20BalanceRaw: erc20Raw,
        erc20Address: erc20?.address,
        note: "Native gas USDC is 18-dec. ERC-20 USDC is 6-dec at 0x3600...0000.",
        faucet: faucetNote(),
      });
    }
    const token = input.tokenAddress || lookupToken(symbol, network)?.address;
    if (!token) {
      return fail(`No ${symbol} address for ${network}`);
    }
    const raw = await ethCall({
      network,
      to: token,
      data: encodeBalanceOf(address),
    });
    const balanceRaw = decodeUint(raw).toString();
    return ok({
      address,
      tokenAddress: token,
      balanceRaw,
      balance: formatUnits(balanceRaw, 6),
      decimals: 6,
      faucet: faucetNote(),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function transferToken(input: TokenInput, symbol: "USDC" | "EURC") {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.to || !input.amount) {
    return fail("network, to, and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const token = input.tokenAddress || lookupToken(symbol, input.network)?.address;
    if (!token) {
      return fail(`No ${symbol} address for ${input.network}`);
    }
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: token,
      data: encodeTransfer(input.to, parseUnits(input.amount, usdcDecimals(input.network))),
    });
    return ok({
      hash,
      tokenAddress: token,
      to: input.to,
      amount: input.amount,
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function approveUsdc(input: TokenInput) {
  const wallet = await requireLinkedWalletForExecution(input._context?.executionId);
  if (!wallet.success) {
    return wallet;
  }
  if (!input.network || !input.spender || !input.amount) {
    return fail("network, spender, and amount are required");
  }
  try {
    const chain = requireChain(input.network);
    const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
    if (!token) {
      return fail("No USDC address for this network");
    }
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: token,
      data: encodeApprove(input.spender, parseUnits(input.amount, 6)),
    });
    return ok({
      hash,
      tokenAddress: token,
      spender: input.spender,
      explorer: explorerTx(input.network, hash),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function checkAllowance(input: TokenInput) {
  if (!input.network || !input.owner || !input.spender) {
    return fail("network, owner, and spender are required");
  }
  try {
    const token = input.tokenAddress || lookupToken("USDC", input.network)?.address;
    if (!token) {
      return fail("No USDC address for this network");
    }
    const raw = await ethCall({
      network: input.network,
      to: token,
      data: encodeAllowance(input.owner, input.spender),
    });
    return ok({
      owner: input.owner,
      spender: input.spender,
      tokenAddress: token,
      allowanceRaw: decodeUint(raw).toString(),
      allowance: formatUnits(raw, 6),
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function lookupTokenAddressStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => lookup(input));
}

export async function getUsdcBalanceStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => balanceOf(input, "USDC"));
}

export async function getEurcBalanceStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => balanceOf(input, "EURC"));
}

export async function transferUsdcStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => transferToken(input, "USDC"));
}

export async function transferEurcStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => transferToken(input, "EURC"));
}

export async function approveUsdcStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => approveUsdc(input));
}

export async function checkUsdcAllowanceStep(input: TokenInput) {
  "use step";
  return withStepLogging(input, () => checkAllowance(input));
}

export const _integrationType = "circle";
