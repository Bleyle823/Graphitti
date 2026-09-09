import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { listAvailableTools } from "./catalog.js";
import { validatePrivyCredentials } from "./credentials.js";
import { privyListWallets } from "./native-actions.js";
import { privyWhoami } from "./graphitti-actions.js";

describe("validatePrivyCredentials", () => {
  it("rejects missing secret", () => {
    const result = validatePrivyCredentials({ PRIVY_APP_ID: "app123" });
    expect(result.ok).toBe(false);
  });

  it("accepts app id and secret", () => {
    const result = validatePrivyCredentials({
      PRIVY_APP_ID: "app123",
      PRIVY_APP_SECRET: "secret",
    });
    expect(result.ok).toBe(true);
  });
});

describe("listAvailableTools", () => {
  it("lists native tools without Graphitti key", () => {
    const tools = listAvailableTools({
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
    });
    expect(tools.some((t) => t.name === "privy_list_wallets")).toBe(true);
    expect(tools.some((t) => t.name === "privy_whoami")).toBe(false);
  });

  it("includes Graphitti tools with API key", () => {
    const tools = listAvailableTools({
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
      GRAPHITTI_API_KEY: "wfb_test",
    });
    expect(tools.some((t) => t.name === "privy_whoami")).toBe(true);
    expect(tools.every((t) => t.name.startsWith("privy_"))).toBe(true);
  });
});

describe("privyListWallets", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      Response.json({ data: [{ id: "wallet_1", address: "0xabc", chain_type: "ethereum" }] })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls api.privy.io with basic auth", async () => {
    const result = await privyListWallets({}, {
      PRIVY_APP_ID: "app-id",
      PRIVY_APP_SECRET: "app-secret",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(1);
    }
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("api.privy.io/v1/wallets"),
      expect.objectContaining({ headers: expect.objectContaining({ "privy-app-id": "app-id" }) })
    );
  });
});

describe("privyWhoami", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      Response.json({ user: { id: "user_1" }, organizationId: "org_1" })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls Graphitti B2B whoami", async () => {
    const result = await privyWhoami({}, {
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
      GRAPHITTI_API_KEY: "wfb_test",
      GRAPHITTI_BASE_URL: "https://example.test",
    });
    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.test/api/b2b/v1/whoami",
      expect.any(Object)
    );
  });
});
