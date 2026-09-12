import type { StripeCredentials } from "./credentials";

const STRIPE_API_URL = "https://api.stripe.com/v1";

export function resolveStripeSecretKey(
  credentials: StripeCredentials
): string | undefined {
  const fromIntegration = credentials.STRIPE_SECRET_KEY?.trim();
  if (fromIntegration) {
    return fromIntegration;
  }
  return process.env.STRIPE_SECRET_KEY?.trim();
}

export async function stripeCustomerExists(
  apiKey: string,
  customerId: string
): Promise<boolean> {
  const response = await fetch(
    `${STRIPE_API_URL}/customers/${encodeURIComponent(customerId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  return response.ok;
}
