import { describe, expect, it } from "vitest";
import {
  CIRCLE_GATEWAY_X402_BASE,
  CIRCLE_GATEWAY_X402_TESTNET,
  MARKETPLACE_GATEWAY_WALLET,
  getMarketplaceSettlement,
} from "@/lib/marketplace/constants";

describe("marketplace settlement", () => {
  it("defaults to Arc mainnet Gateway", () => {
    const settlement = getMarketplaceSettlement();
    expect(settlement.chain.id).toBe("arc");
    expect(settlement.network).toBe("eip155:5042");
    expect(settlement.gatewayWallet).toBe(
      "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE"
    );
    expect(settlement.gatewayApi).toBe(CIRCLE_GATEWAY_X402_BASE);
    expect(MARKETPLACE_GATEWAY_WALLET).toBe(settlement.gatewayWallet);
  });

  it("keeps Arc Testnet Gateway for arc-testnet listings", () => {
    const settlement = getMarketplaceSettlement("arc-testnet");
    expect(settlement.chain.id).toBe("arc-testnet");
    expect(settlement.network).toBe("eip155:5042002");
    expect(settlement.gatewayWallet).toBe(
      "0x0077777d7EBA4688BDeF3E311b846F25870A19B9"
    );
    expect(settlement.gatewayApi).toBe(CIRCLE_GATEWAY_X402_TESTNET);
  });
});
