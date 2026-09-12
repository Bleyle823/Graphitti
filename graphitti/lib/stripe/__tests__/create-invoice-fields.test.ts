import { describe, expect, it } from "vitest";
import { normalizeStripeCustomerField } from "@/plugins/stripe/resolve-customer-fields";

describe("normalizeStripeCustomerField", () => {
  it("treats unresolved templates as missing", () => {
    expect(
      normalizeStripeCustomerField(
        "{{@stripe-settle-customer:Create Stripe customer.id}}"
      )
    ).toBeUndefined();
    expect(normalizeStripeCustomerField("cus_abc123")).toBe("cus_abc123");
    expect(normalizeStripeCustomerField("client@example.com")).toBe(
      "client@example.com"
    );
  });
});
