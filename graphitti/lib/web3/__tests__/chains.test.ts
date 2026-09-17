import { describe, expect, it } from "vitest";
import { getArcAddresses, resolveArcNetworkId } from "@/lib/arc/app-kit-flows";
import {
  formatUnits,
  isArcNetwork,
  requireChain,
  resolveNetworkId,
} from "@/lib/web3/chains";

describe("chains", () => {
  it("resolves base_sepolia and base-sepolia to Base Sepolia RPC", () => {
    expect(resolveNetworkId("base_sepolia")).toBe("base-sepolia");
    const chain = requireChain("base-sepolia");
    expect(chain.chainId).toBe(84_532);
    expect(chain.rpcUrl).toContain("sepolia.base.org");
  });

  it("resolves Arc mainnet and Arc Testnet", () => {
    expect(resolveNetworkId("arc-mainnet")).toBe("arc");
    expect(resolveArcNetworkId("arc-mainnet")).toBe("arc");
    expect(isArcNetwork("arc")).toBe(true);
    expect(isArcNetwork("arc-mainnet")).toBe(true);
    expect(isArcNetwork("arc-testnet")).toBe(true);
    expect(isArcNetwork("base")).toBe(false);
    const mainnet = requireChain("arc");
    expect(mainnet.chainId).toBe(5042);
    expect(mainnet.rpcUrl).toBe("https://rpc.mainnet.arc.io");
    expect(mainnet.cctpDomain).toBe(26);
    const testnet = requireChain("arc-testnet");
    expect(testnet.chainId).toBe(5_042_002);
    expect(getArcAddresses("arc").gatewayWallet).toBe(
      "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE"
    );
    expect(getArcAddresses("arc-testnet").gatewayWallet).toBe(
      "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
    );
  });

  it("formatUnits treats empty eth_call as zero", () => {
    expect(formatUnits("0x", 6)).toBe("0");
  });
});
