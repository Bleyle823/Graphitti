import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { StripeCredentials } from "../credentials";
import { resolveStripeSecretKey } from "../stripe-http";

const STRIPE_API_URL = "https://api.stripe.com/v1";

type StripeCustomerResponse = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  created: number;
};

type StripeErrorResponse = {
  error: {
    type: string;
    message: string;
    code?: string;
  };
};

export type CreateCustomerCoreInput = {
  email: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata?: string;
};

export type CreateCustomerInput = StepInput &
  CreateCustomerCoreInput & {
    integrationId?: string;
  };

type CreateCustomerResult =
  | { success: true; data: { id: string; email: string } }
  | ReturnType<typeof fail>;

export async function createStripeCustomer(
  input: CreateCustomerCoreInput,
  credentials: StripeCredentials
): Promise<CreateCustomerResult> {
  const apiKey = resolveStripeSecretKey(credentials);

  if (!apiKey) {
    return fail(
      "STRIPE_SECRET_KEY is not configured. Please add it in Project Integrations."
    );
  }

  const email = input.email?.trim();
  if (!email) {
    return fail("Email is required to create a Stripe customer");
  }

  try {
    const params = new URLSearchParams();
    params.append("email", email);

    if (input.name) {
      params.append("name", input.name);
    }
    if (input.phone) {
      params.append("phone", input.phone);
    }
    if (input.description) {
      params.append("description", input.description);
    }
    if (input.metadata) {
      try {
        const metadataObj = JSON.parse(input.metadata) as Record<
          string,
          string
        >;
        for (const [key, value] of Object.entries(metadataObj)) {
          params.append(`metadata[${key}]`, String(value));
        }
      } catch {
        return fail("Invalid metadata JSON format");
      }
    }

    const response = await fetch(`${STRIPE_API_URL}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as StripeErrorResponse;
      return fail(
        errorData.error?.message ||
          `HTTP ${response.status}: Failed to create customer`
      );
    }

    const data = (await response.json()) as StripeCustomerResponse;
    return ok({ id: data.id, email: data.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Failed to create customer: ${message}`);
  }
}

async function stepHandler(
  input: CreateCustomerCoreInput,
  credentials: StripeCredentials
): Promise<CreateCustomerResult> {
  return createStripeCustomer(input, credentials);
}

export async function createCustomerStep(
  input: CreateCustomerInput
): Promise<CreateCustomerResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createCustomerStep.maxRetries = 0;

export const _integrationType = "stripe";
