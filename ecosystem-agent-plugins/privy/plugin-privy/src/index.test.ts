import { describe, expect, it } from "vitest";
import { privyPlugin } from "./index.js";

describe("plugin-privy", () => {
  it("registers privy actions", () => {
    expect(privyPlugin.name).toBe("privy");
    expect(privyPlugin.actions.length).toBeGreaterThan(20);
    expect(
      privyPlugin.actions.some((a: { name: string }) => a.name === "PRIVY_GET_WALLET")
    ).toBe(true);
    expect(
      privyPlugin.actions.some((a: { name: string }) => a.name === "PRIVY_CREATE_TREASURY_INTENT")
    ).toBe(true);
    expect(
      privyPlugin.actions.some((a: { name: string }) => a.name === "PRIVY_APPROVE_TREASURY_INTENT")
    ).toBe(true);
  });
});
