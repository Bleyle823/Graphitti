import "server-only";

import { ethers, Interface } from "ethers";
import { coerceArgsForAbi, reshapeArgsForAbi } from "@/lib/abi/struct-args";
import { validateArgsForAbi } from "@/lib/abi/validate-args";
import { findAbiFunction, type AbiItem } from "@/lib/abi/utils";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage } from "@/lib/utils";
import { requireChain } from "@/lib/web3/chains";
import { sendSponsoredTransaction } from "@/lib/web3/privy-signer";
import { requireLinkedWalletForExecution } from "@/lib/web3/user-wallet";

export type WriteContractCoreInput = {
  contractAddress: string;
  network: string;
  abi: string;
  abiFunction: string;
  functionArgs?: string;
  ethValue?: string;
  gasLimitMultiplier?: string;
  priorityFeeGwei?: string;
  usePrivateMempool?: boolean;
  strict?: boolean;
  web3Connection?: string;
  _context?: {
    executionId?: string;
    organizationId?: string;
    workflowId?: string;
  };
};

export type WriteContractResult =
  | {
      success: true;
      transactionHash?: string;
      chainId?: number;
      transactionLink?: string;
      sponsored?: boolean;
      result?: unknown;
      error?: string;
    }
  | {
      success: false;
      error: string;
      errorClass?: ExecutionErrorType;
      transactionHash?: string;
      chainId?: number;
      sponsored?: boolean;
    };

export function resolveFailOnError(failOnError: unknown): boolean {
  if (failOnError === undefined || failOnError === null || failOnError === "") {
    return true;
  }
  if (typeof failOnError === "boolean") {
    return failOnError;
  }
  if (typeof failOnError === "string") {
    return failOnError.toLowerCase() !== "false";
  }
  return Boolean(failOnError);
}

export function applyFailOnError(
  result: WriteContractResult,
  failOnError: unknown
): WriteContractResult {
  if (result.success || resolveFailOnError(failOnError)) {
    return result;
  }
  return {
    success: true,
    error: result.error,
  };
}

function parseFunctionArgs(functionArgs?: string): unknown[] {
  if (!functionArgs || functionArgs.trim() === "") {
    return [];
  }
  const parsed = JSON.parse(functionArgs) as unknown;
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function writeContractCore(
  input: WriteContractCoreInput
): Promise<WriteContractResult> {
  const {
    contractAddress,
    network,
    abi,
    abiFunction,
    functionArgs,
    ethValue,
    _context,
  } = input;

  if (!abiFunction?.trim()) {
    return {
      success: false,
      error: "Missing `abiFunction` in the step config",
      errorClass: ExecutionErrorType.USER,
    };
  }

  if (!ethers.isAddress(contractAddress)) {
    return {
      success: false,
      error: `Invalid contract address: ${contractAddress}`,
      errorClass: ExecutionErrorType.USER,
    };
  }

  let parsedAbi: unknown;
  try {
    parsedAbi = JSON.parse(abi);
  } catch (error) {
    return {
      success: false,
      error: `Invalid ABI JSON: ${getErrorMessage(error)}`,
      errorClass: ExecutionErrorType.USER,
    };
  }

  const fn = findAbiFunction(parsedAbi as AbiItem[], abiFunction);
  if (!fn) {
    return {
      success: false,
      error: `Function "${abiFunction}" not found in ABI`,
      errorClass: ExecutionErrorType.USER,
    };
  }

  let args: unknown[];
  try {
    args = parseFunctionArgs(functionArgs);
    const validation = validateArgsForAbi(args, fn);
    if (!validation.ok) {
      return {
        success: false,
        error: validation.error,
        errorClass: ExecutionErrorType.USER,
      };
    }
    args = coerceArgsForAbi(args, fn);
    args = reshapeArgsForAbi(args, fn);
  } catch (error) {
    return {
      success: false,
      error: `Invalid function arguments: ${getErrorMessage(error)}`,
      errorClass: ExecutionErrorType.USER,
    };
  }

  const iface = new Interface(parsedAbi as ethers.InterfaceAbi);
  const data = iface.encodeFunctionData(abiFunction, args);

  let valueHex = "0x0";
  if (ethValue && ethValue.trim() !== "") {
    try {
      valueHex = ethers.toBeHex(ethers.parseEther(ethValue.trim()));
    } catch (error) {
      return {
        success: false,
        error: `Invalid payable value: ${getErrorMessage(error)}`,
        errorClass: ExecutionErrorType.USER,
      };
    }
  }

  const wallet = await requireLinkedWalletForExecution(_context?.executionId);
  if (!wallet.success) {
    return {
      success: false,
      error: wallet.error.message,
      errorClass: ExecutionErrorType.USER,
    };
  }

  try {
    const chain = requireChain(network);
    const { hash } = await sendSponsoredTransaction({
      walletId: wallet.wallet.privyWalletId,
      chain,
      to: contractAddress,
      data,
      value: valueHex,
    });

    return {
      success: true,
      transactionHash: hash,
      chainId: chain.chainId,
      transactionLink: `${chain.explorerUrl}/tx/${hash}`,
      sponsored: true,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
