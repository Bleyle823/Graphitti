import "server-only";

import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { ethGetLogs, ethGetTransactionByHash, ethGetTransactionReceipt } from "@/lib/web3/rpc";

export type TxInput = StepInput & {
  network: string;
  txHash?: string;
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  topic0?: string;
};

async function getTx(input: TxInput) {
  if (!input.txHash) {
    return fail("Transaction hash is required");
  }
  try {
    const tx = await ethGetTransactionByHash(input.network, input.txHash);
    const receipt = await ethGetTransactionReceipt(input.network, input.txHash);
    if (!tx) {
      return fail("Transaction not found");
    }
    return ok({ transaction: tx, receipt });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function queryLogs(input: TxInput) {
  try {
    const logs = await ethGetLogs({
      network: input.network,
      address: input.address,
      fromBlock: input.fromBlock,
      toBlock: input.toBlock,
      topics: input.topic0 ? [input.topic0] : undefined,
    });
    return ok({ logs, count: logs.length });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function getTransactionStep(input: TxInput) {
  "use step";
  return withStepLogging(input, () => getTx(input));
}

export async function queryLogsStep(input: TxInput) {
  "use step";
  return withStepLogging(input, () => queryLogs(input));
}

export const _integrationType = "web3";
