import { describe, expect, it } from "vitest";
import { lookupToken } from "@/plugins/circle/shared";

describe("lookupToken", () => {
  it("resolves USDC on base-sepolia and base_sepolia", () => {
    const hyphen = lookupToken("USDC", "base-sepolia");
    const underscore = lookupToken("USDC", "base_sepolia");
    expect(hyphen?.address).toBe("0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    expect(underscore?.address).toBe(hyphen?.address);
  });
});
