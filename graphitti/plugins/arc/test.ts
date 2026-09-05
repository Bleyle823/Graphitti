export async function testArc(_credentials: Record<string, string>) {
  try {
    const response = await fetch("https://rpc.testnet.arc.network", {
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
      return { success: false, error: `Arc RPC HTTP ${response.status}` };
    }
    const body = (await response.json()) as { result?: string; error?: { message: string } };
    if (body.error) {
      return { success: false, error: body.error.message };
    }
    if (!body.result) {
      return { success: false, error: "Arc RPC returned no block number" };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
