export function normalizeStripeCustomerField(value?: string): string | undefined {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "undefined" || trimmed.includes("{{")) {
    return undefined;
  }
  return trimmed;
}
