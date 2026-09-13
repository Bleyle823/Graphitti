import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { executePrivyTool, resolveCredentials } from "./index.js";

const GRAPHITTI_ENV = "C:/Users/Public/Graphitti-1/graphitti/.env.local";

function loadPrivyEnvFromGraphitti(): boolean {
  if (
    process.env.PRIVY_APP_ID?.trim() &&
    process.env.PRIVY_APP_SECRET?.trim()
  ) {
    return true;
  }
  if (!existsSync(GRAPHITTI_ENV)) {
    return false;
  }
  const text = readFileSync(GRAPHITTI_ENV, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (
      key === "PRIVY_APP_ID" ||
      key === "PRIVY_APP_SECRET" ||
      key === "PRIVY_AUTHORIZATION_KEY"
    ) {
      process.env[key] = value;
    }
  }
  return Boolean(
    process.env.PRIVY_APP_ID?.trim() && process.env.PRIVY_APP_SECRET?.trim()
  );
}

const canRunLive = loadPrivyEnvFromGraphitti();

describe.skipIf(!canRunLive)("privy-core live", () => {
  it("lists server wallets via Privy API", async () => {
    const creds = resolveCredentials();
    const result = await executePrivyTool(
      "privy_list_wallets",
      { limit: 1 },
      creds
    );
    if (!result.success) {
      throw new Error(result.error);
    }
  });
});
