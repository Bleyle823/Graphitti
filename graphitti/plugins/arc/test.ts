export async function testArc(_credentials: Record<string, string>) {
  const endpoints = [
    "https://rpc.testnet.arc.network",
    "https://rpc.mainnet.arc.io",
  ];
  let lastError = "Arc RPC returned no block number";
  for (const rpcUrl of endpoints) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_blockNumber",
          params: [],
        }),
      });
      if (!response.ok) {
        lastError = `Arc RPC HTTP ${response.status}`;
        continue;
      }
      const body = (await response.json()) as {
        result?: string;
        error?: { message: string };
      };
      if (body.error) {
        lastError = body.error.message;
        continue;
      }
      if (body.result) {
        return { success: true };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { success: false, error: lastError };
}
