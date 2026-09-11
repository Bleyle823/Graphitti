import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAINS } from "@/lib/web3/chains";
import { getPrivyGasAttempts, supportsUserPaysGas } from "@/lib/web3/privy-gas";

const arc = CHAINS["arc-testnet"];
const base = CHAINS.base;
const polygon = CHAINS.polygon;

beforeEach(() => {
  vi.stubEnv("PRIVY_GAS_MODE", undefined);
  vi.stubEnv("PRIVY_GAS_ASSET", undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supportsUserPaysGas", () => {
  it("accepts chain/asset pairs served by the Privy paymaster", () => {
    expect(supportsUserPaysGas(base, "usdc")).toBe(true);
    expect(supportsUserPaysGas(polygon, "usdt")).toBe(true);
  });

  it("rejects pairs the paymaster does not cover", () => {
    expect(supportsUserPaysGas(base, "usdg")).toBe(false);
    expect(supportsUserPaysGas(arc, "usdc")).toBe(false);
  });
});

describe("getPrivyGasAttempts", () => {
  it("falls back from user-pays to app credits to the wallet balance", () => {
    expect(getPrivyGasAttempts(base).map((attempt) => attempt.label)).toEqual([
      "user-pays",
      "app-pays",
      "self-pay",
    ]);
  });

  it("sends sponsor_options only on the user-pays attempt", () => {
    const [userPays, appPays, selfPay] = getPrivyGasAttempts(base);

    expect(userPays.sponsorOptions).toEqual({ asset: "usdc" });
    expect(appPays.sponsorOptions).toBeUndefined();
    expect(appPays.sponsor).toBe(true);
    expect(selfPay.sponsor).toBe(false);
  });

  it("prefers app credits when the app is in app-pays mode", () => {
    vi.stubEnv("PRIVY_GAS_MODE", "app-pays");

    expect(getPrivyGasAttempts(base).map((attempt) => attempt.label)).toEqual([
      "app-pays",
      "user-pays",
      "self-pay",
    ]);
  });

  it("skips user-pays when the asset is unsupported on the chain", () => {
    vi.stubEnv("PRIVY_GAS_ASSET", "usdg");

    expect(getPrivyGasAttempts(base).map((attempt) => attempt.label)).toEqual([
      "app-pays",
      "self-pay",
    ]);
  });

  it("never requests a paymaster on chains that bill gas in native stablecoin", () => {
    const attempts = getPrivyGasAttempts(arc);

    expect(attempts).toHaveLength(1);
    expect(attempts[0].sponsor).toBe(false);
    expect(attempts[0].sponsorOptions).toBeUndefined();
  });
});
