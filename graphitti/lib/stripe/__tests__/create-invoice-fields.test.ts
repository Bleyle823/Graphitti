import { describe, expect, it } from "vitest";
import {
  normalizeStripeCustomerField,
  readStripeCustomerId,
} from "@/plugins/stripe/resolve-customer-fields";

describe("normalizeStripeCustomerField", () => {
  it("reads customer id from customerId or customer alias", () => {
    expect(readStripeCustomerId({ customerId: "cus_test123" })).toBe(
      "cus_test123"
    );
    expect(readStripeCustomerId({ customer: "cus_alias456" })).toBe(
      "cus_alias456"
    );
  });

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
