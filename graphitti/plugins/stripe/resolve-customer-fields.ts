export function normalizeStripeCustomerField(
  value?: string | number | null
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "undefined" || trimmed.includes("{{")) {
    return undefined;
  }
  return trimmed;
}

export function readStripeCustomerId(input: {
  customerId?: string | number | null;
  customer?: string | number | null;
}): string | undefined {
  return (
    normalizeStripeCustomerField(input.customerId) ??
    normalizeStripeCustomerField(input.customer)
  );
}
