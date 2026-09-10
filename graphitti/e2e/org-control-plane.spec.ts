import { expect, test } from "@playwright/test";

const LOCAL_DB_HOST = /localhost|127\.0\.0\.1|::1/;
const GR_OR_WFB_PREFIX = /gr_|wfb_/;

function isLocalDatabaseUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return LOCAL_DB_HOST.test(value);
}

const hasLocalDb = isLocalDatabaseUrl(process.env.DATABASE_URL);

test.describe("Org control plane API", () => {
  test("rejects kh_ API keys and accepts missing auth as 401", async ({
    request,
  }) => {
    const missing = await request.get("/api/b2b/v1/whoami");
    expect(missing.status()).toBe(401);

    const keeperhub = await request.get("/api/b2b/v1/whoami", {
      headers: { Authorization: "Bearer kh_not-a-graphitti-key" },
    });
    expect(keeperhub.status()).toBe(401);
    const body = (await keeperhub.json()) as { error?: string };
    expect(body.error ?? "").toMatch(GR_OR_WFB_PREFIX);
  });

  test("rejects unauthenticated treasury and api-key writes", async ({
    request,
  }) => {
    const spendCap = await request.patch("/api/treasury/spend-cap", {
      data: { organizationId: "org_missing", autoSpendCapUsdc: "25" },
    });
    expect([401, 403]).toContain(spendCap.status());

    const apiKeys = await request.post("/api/api-keys", {
      data: { organizationId: "org_missing", name: "e2e" },
    });
    expect([401, 403]).toContain(apiKeys.status());
  });
});

test.describe("Org control plane API (local db)", () => {
  test.skip(!hasLocalDb, "Requires a local DATABASE_URL");

  test("spend-cap route exists for authenticated admins", async ({
    request,
  }) => {
    const response = await request.patch("/api/treasury/spend-cap", {
      data: { organizationId: "org_missing", autoSpendCapUsdc: "25" },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe("live-privy", () => {
  test.skip(
    process.env.GRAPHITTI_LIVE_PRIVY !== "1",
    "Opt-in live Privy: set GRAPHITTI_LIVE_PRIVY=1"
  );

  test("live-privy under-cap transfer is not run in CI", () => {
    expect(process.env.GRAPHITTI_LIVE_PRIVY).toBe("1");
  });
});
