import { requireChain } from "./chains";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

async function rpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP ${response.status} from ${rpcUrl}`);
  }

  const body = (await response.json()) as JsonRpcResponse<T>;
  if (body.error) {
    throw new Error(body.error.message);
  }
  if (body.result === undefined) {
    throw new Error(`RPC ${method} returned no result`);
  }
  return body.result;
}

export async function ethCall(options: {
  network: string;
  to: string;
  data: string;
  from?: string;
}): Promise<string> {
  const chain = requireChain(options.network);
  return rpcCall<string>(chain.rpcUrl, "eth_call", [
    {
      to: options.to,
      data: options.data,
      ...(options.from ? { from: options.from } : {}),
    },
    "latest",
  ]);
}

export async function ethGetBalance(
  network: string,
  address: string
): Promise<string> {
  const chain = requireChain(network);
  return rpcCall<string>(chain.rpcUrl, "eth_getBalance", [address, "latest"]);
}

export async function ethGetTransactionReceipt(
  network: string,
  txHash: string
): Promise<Record<string, unknown> | null> {
  const chain = requireChain(network);
  return rpcCall<Record<string, unknown> | null>(
    chain.rpcUrl,
    "eth_getTransactionReceipt",
    [txHash]
  );
}

export async function ethGetTransactionByHash(
  network: string,
  txHash: string
): Promise<Record<string, unknown> | null> {
  const chain = requireChain(network);
  return rpcCall<Record<string, unknown> | null>(
    chain.rpcUrl,
    "eth_getTransactionByHash",
    [txHash]
  );
}

export async function ethGetLogs(options: {
  network: string;
  address?: string;
  fromBlock?: string;
  toBlock?: string;
  topics?: (string | null)[];
}): Promise<unknown[]> {
  const chain = requireChain(options.network);
  return rpcCall<unknown[]>(chain.rpcUrl, "eth_getLogs", [
    {
      ...(options.address ? { address: options.address } : {}),
      fromBlock: options.fromBlock ?? "latest",
      toBlock: options.toBlock ?? "latest",
      ...(options.topics ? { topics: options.topics } : {}),
    },
  ]);
}

export async function ethGetBlockNumber(network: string): Promise<string> {
  const chain = requireChain(network);
  return rpcCall<string>(chain.rpcUrl, "eth_blockNumber", []);
}
