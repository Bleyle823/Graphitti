import { describe, expect, it, vi } from "vitest";
import { extractBearerToken } from "@/lib/auth/api-key";
import {
  hashApiKey,
  isSupportedApiKeyPrefix,
  mintApiKey,
  ORG_API_KEY_PREFIX,
  PERSONAL_API_KEY_PREFIX,
} from "@/lib/auth/api-key-mint";
import { requireB2bAuth } from "@/lib/auth/b2b-auth";
import { resolveApproveIntentFields } from "@/lib/org/intent-guard";
import { canApproveIntents } from "@/lib/org/member-role";
import {
  sumUsdc,
  wouldExceedDailyCap,
  wouldExceedPerTxCap,
} from "@/lib/org/spend-cap";

const GR_OR_WFB = /gr_|wfb_/;

vi.mock("server-only", () => ({}));

const findFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      apiKeys: {
        findFirst: () => findFirst(),
      },
    },
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
  },
}));

describe("api key mint", () => {
  it("mints org keys with gr_ and personal keys with wfb_", () => {
    const org = mintApiKey("organization");
    const personal = mintApiKey("personal");
    expect(org.key.startsWith(ORG_API_KEY_PREFIX)).toBe(true);
    expect(personal.key.startsWith(PERSONAL_API_KEY_PREFIX)).toBe(true);
    expect(hashApiKey(org.key)).toBe(org.hash);
    expect(isSupportedApiKeyPrefix(org.key)).toBe(true);
    expect(isSupportedApiKeyPrefix(personal.key)).toBe(true);
    expect(isSupportedApiKeyPrefix("kh_secret")).toBe(false);
  });
});

describe("spend caps", () => {
  it("rejects amounts over the per-tx auto cap", () => {
    expect(wouldExceedPerTxCap("51", "50")).toBe(true);
    expect(wouldExceedPerTxCap("50", "50")).toBe(false);
  });

  it("rejects projected daily spend over the daily cap", () => {
    expect(wouldExceedDailyCap("40", "20", "50")).toBe(true);
    expect(wouldExceedDailyCap("40", "10", "50")).toBe(false);
    expect(wouldExceedDailyCap("40", "20", null)).toBe(false);
  });

  it("settling then releasing frees capacity in the sum helper", () => {
    expect(sumUsdc(["10", "15"])).toBe("25");
  });
});

describe("intent freeze", () => {
  it("ignores swapped recipient and amount on approve", () => {
    const frozen = resolveApproveIntentFields({
      toAddress: "0xABC",
      amountUsdc: "25",
    });
    expect(frozen.toAddress).toBe("0xabc");
    expect(frozen.amountUsdc).toBe("25");
  });
});

describe("b2b auth prefixes", () => {
  it("accepts gr_ and wfb_ bearer tokens and rejects kh_ or missing headers", async () => {
    expect(extractBearerToken(null)).toBeUndefined();
    expect(isSupportedApiKeyPrefix("kh_secret")).toBe(false);

    const missing = await requireB2bAuth(null);
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.status).toBe(401);
      expect(missing.error).toMatch(GR_OR_WFB);
    }

    const keeperhub = await requireB2bAuth("Bearer kh_not-graphitti");
    expect(keeperhub.success).toBe(false);

    const orgKey = mintApiKey("organization");
    findFirst.mockResolvedValueOnce({
      id: "key_1",
      userId: "user_1",
      organizationId: "org_1",
      scopes: ["treasury:read"],
    });
    const orgAuth = await requireB2bAuth(`Bearer ${orgKey.key}`, [
      "treasury:read",
    ]);
    expect(orgAuth.success).toBe(true);
    if (orgAuth.success) {
      expect(orgAuth.auth.organizationId).toBe("org_1");
    }

    const personalKey = mintApiKey("personal");
    findFirst.mockResolvedValueOnce({
      id: "key_2",
      userId: "user_1",
      organizationId: null,
      scopes: ["wallet:read"],
    });
    const personalAuth = await requireB2bAuth(`Bearer ${personalKey.key}`);
    expect(personalAuth.success).toBe(true);
  });

  it("lets owners and admins approve intents", () => {
    expect(canApproveIntents("owner")).toBe(true);
    expect(canApproveIntents("admin")).toBe(true);
    expect(canApproveIntents("member")).toBe(false);
  });
});
