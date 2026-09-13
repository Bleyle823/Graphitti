import { describe, expect, it } from "vitest";
import { buildIntentAuthorizationSignInput } from "@/lib/web3/privy-intent-authorize";

describe("buildIntentAuthorizationSignInput", () => {
  it("binds intent_id and request_details for Privy authorize signatures", () => {
    const signInput = buildIntentAuthorizationSignInput(
      "intent_abc",
      {
        method: "POST",
        url: "https://api.privy.io/v1/wallets/wallet_1/transfer",
        body: { amount: "25" },
      },
      "app_test",
      1_741_834_854_578
    );

    expect(signInput).toEqual({
      version: 1,
      method: "POST",
      url: "https://api.privy.io/v1/wallets/wallet_1/transfer",
      body: { amount: "25" },
      timestamp: 1_741_834_854_578,
      intent_id: "intent_abc",
      headers: { "privy-app-id": "app_test" },
    });
  });
});
