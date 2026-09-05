import "server-only";

import { ethers, Interface } from "ethers";
import { coerceArgsForAbi, reshapeArgsForAbi } from "@/lib/abi/struct-args";
import { validateArgsForAbi } from "@/lib/abi/validate-args";
import { findAbiFunction, type AbiItem } from "@/lib/abi/utils";
import { ExecutionErrorType } from "@/lib/errors/execution-error-type";
import { getErrorMessage } from "@/lib/utils";
import { requireChain } from "@/lib/web3/chains";
import { ethCall } from "@/lib/web3/rpc";
import {
  type AbiOutputParam,
  structureAbiOutputs,
} from "@/plugins/web3/steps/structure-abi-result";

export type ReadContractCoreInput = {
  contractAddress: string;
  network: string;
  abi: string;
  abiFunction: string;
  functionArgs?: string;
  _context?: { executionId?: string; organizationId?: string };
};

export type ReadContractResult =
  | { success: true; result: unknown; addressLink: string }
  | { success: false; error: string; errorClass?: ExecutionErrorType };

function parseFunctionArgs(functionArgs?: string): unknown[] {
  if (!functionArgs || functionArgs.trim() === "") {
    return [];
  }
  const parsed = JSON.parse(functionArgs) as unknown;
  return Array.isArray(parsed) ? parsed : [parsed];
}

export async function readContractCore(
  input: ReadContractCoreInput
): Promise<ReadContractResult> {
  const { contractAddress, network, abi, abiFunction, functionArgs } = input;

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

  try {
    const chain = requireChain(network);
    const raw = await ethCall({ network, to: contractAddress, data });
    const decoded = iface.decodeFunctionResult(abiFunction, raw);
    const outputs = (fn.outputs ?? []) as AbiOutputParam[];
    const result =
      outputs.length > 0
        ? structureAbiOutputs(outputs, decoded)
        : decoded;

    return {
      success: true,
      result,
      addressLink: `${chain.explorerUrl}/address/${contractAddress}`,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      errorClass: ExecutionErrorType.EXTERNAL,
    };
  }
}
