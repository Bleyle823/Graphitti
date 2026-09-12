import { describe, expect, it } from "vitest";
import { formatUnits, requireChain, resolveNetworkId } from "@/lib/web3/chains";

describe("chains", () => {
  it("resolves base_sepolia and base-sepolia to Base Sepolia RPC", () => {
    expect(resolveNetworkId("base_sepolia")).toBe("base-sepolia");
    const chain = requireChain("base-sepolia");
    expect(chain.chainId).toBe(84_532);
    expect(chain.rpcUrl).toContain("sepolia.base.org");
  });

  it("formatUnits treats empty eth_call as zero", () => {
    expect(formatUnits("0x", 6)).toBe("0");
  });
});
