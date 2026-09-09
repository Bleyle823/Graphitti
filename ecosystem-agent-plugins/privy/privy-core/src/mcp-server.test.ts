import { describe, expect, it } from "vitest";
import { listAvailableTools } from "./catalog.js";

describe("MCP tools/list contract", () => {
  it("lists only privy_* tool names", () => {
    const tools = listAvailableTools({
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
      GRAPHITTI_API_KEY: "wfb_test",
    });

    expect(tools.length).toBeGreaterThan(30);
    for (const tool of tools) {
      expect(tool.name.startsWith("privy_")).toBe(true);
    }
  });

  it("grows with Graphitti-backed tools when keyed", () => {
    const without = listAvailableTools({
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
    });
    const withKey = listAvailableTools({
      PRIVY_APP_ID: "app",
      PRIVY_APP_SECRET: "secret",
      GRAPHITTI_API_KEY: "wfb_test",
    });
    expect(withKey.length).toBeGreaterThan(without.length);
    expect(withKey.some((tool) => tool.name === "privy_get_treasury")).toBe(true);
  });
});
