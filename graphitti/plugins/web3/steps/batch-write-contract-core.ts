import "server-only";

import { Interface, ethers } from "ethers";
import { coerceArgsForAbi, reshapeArgsForAbi } from "@/lib/abi/struct-args";
import { validateArgsForAbi } from "@/lib/abi/validate-args";
import { findAbiFunction, type AbiItem } from "@/lib/abi/utils";
import { MULTICALL3_ABI, MULTICALL3_ADDRESS } from "@/lib/contracts/multicall3";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage, resolveFailOnError } from "@/lib/utils";
import { requireChain } from "@/lib/web3/chains";
import { writeTransaction } from "@/lib/web3/transaction-writer";

const MAX_TOTAL_CALLS = 50;

type NormalizedCall = {
  contractAddress: string;
  abi: string;
  abiFunction: string;
  args: unknown[];
};

export type BatchWriteCallResult = {
  success: boolean;
  result?: unknown;
  error?: string;
};

export type BatchWriteContractCoreInput = {
  network: string;
  calls: string | unknown[];
  isolateCallFailures?: string | boolean;
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

export type BatchWriteContractResult =
  | {
      success: true;
      transactionHash: string;
      transactionLink?: string;
      results?: BatchWriteCallResult[];
      totalCalls: number;
    }
  | {
      success: false;
      error: string;
      errorClass?: ExecutionErrorType;
      transactionHash?: string;
    };

function parseCalls(
  calls: string | unknown[]
): { calls: NormalizedCall[]; error?: string } {
  let raw: unknown[];
  if (typeof calls === "string") {
    try {
      raw = JSON.parse(calls) as unknown[];
    } catch (error) {
      return { calls: [], error: `Invalid calls JSON: ${getErrorMessage(error)}` };
    }
  } else {
    raw = calls;
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { calls: [], error: "At least one call is required" };
  }
  if (raw.length > MAX_TOTAL_CALLS) {
    return {
      calls: [],
      error: `Too many calls (${raw.length}). Maximum is ${MAX_TOTAL_CALLS}.`,
    };
  }

  const normalized: NormalizedCall[] = [];
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== "object") {
      return { calls: [], error: `Call ${index + 1} must be an object` };
    }
    const call = entry as Record<string, unknown>;
    const contractAddress = String(call.contractAddress ?? "");
    const abi = String(call.abi ?? "");
    const abiFunction = String(call.abiFunction ?? "");
    if (!ethers.isAddress(contractAddress)) {
      return {
        calls: [],
        error: `Call ${index + 1} has invalid contract address`,
      };
    }
    if (!abiFunction.trim()) {
      return { calls: [], error: `Call ${index + 1} is missing abiFunction` };
    }
    let args: unknown[] = [];
    if (call.args !== undefined) {
      args = Array.isArray(call.args) ? call.args : [call.args];
    }
    normalized.push({ contractAddress, abi, abiFunction, args });
  }

  return { calls: normalized };
}

function encodeCall(call: NormalizedCall): { callData: string; error?: string } {
  let parsedAbi: unknown;
  try {
    parsedAbi = JSON.parse(call.abi);
  } catch (error) {
    return { callData: "0x", error: `Invalid ABI JSON: ${getErrorMessage(error)}` };
  }

  const fn = findAbiFunction(parsedAbi as AbiItem[], call.abiFunction);
  if (!fn) {
    return {
      callData: "0x",
      error: `Function "${call.abiFunction}" not found in ABI`,
    };
  }

  const validation = validateArgsForAbi(call.args, fn);
  if (!validation.ok) {
    return { callData: "0x", error: validation.error };
  }

  const args = reshapeArgsForAbi(coerceArgsForAbi(call.args, fn), fn);
  const iface = new Interface(parsedAbi as ethers.InterfaceAbi);
  return { callData: iface.encodeFunctionData(call.abiFunction, args) };
}

export function applyBatchFailOnError(
  result: BatchWriteContractResult,
  failOnError: unknown
): BatchWriteContractResult {
  if (result.success || resolveFailOnError(failOnError)) {
    return result;
  }
  return {
    success: true,
    transactionHash: result.transactionHash ?? "",
    transactionLink: undefined,
    totalCalls: 0,
  };
}

export async function batchWriteContractCore(
  input: BatchWriteContractCoreInput
): Promise<BatchWriteContractResult> {
  const parsed = parseCalls(input.calls);
  if (parsed.error) {
    return {
      success: false,
      error: parsed.error,
      errorClass: ExecutionErrorType.USER,
    };
  }

  const allowFailure =
    input.isolateCallFailures === true ||
    input.isolateCallFailures === "true";

  const aggregateCalls: Array<{
    target: string;
    allowFailure: boolean;
    callData: string;
  }> = [];

  for (const call of parsed.calls) {
    const encoded = encodeCall(call);
    if (encoded.error) {
      return {
        success: false,
        error: encoded.error,
        errorClass: ExecutionErrorType.USER,
      };
    }
    aggregateCalls.push({
      target: call.contractAddress,
      allowFailure,
      callData: encoded.callData,
    });
  }

  const multicallIface = new Interface(MULTICALL3_ABI as ethers.InterfaceAbi);
  const data = multicallIface.encodeFunctionData("aggregate3", [aggregateCalls]);

  try {
    const chain = requireChain(input.network);
    const write = await writeTransaction({
      chain,
      to: MULTICALL3_ADDRESS,
      data,
      executionId: input._context?.executionId,
    });
    if (!write.success) {
      return {
        success: false,
        error: write.error,
        errorClass: ExecutionErrorType.EXTERNAL,
      };
    }

    return {
      success: true,
      transactionHash: write.hash,
      transactionLink: `${chain.explorerUrl}/tx/${write.hash}`,
      totalCalls: parsed.calls.length,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
