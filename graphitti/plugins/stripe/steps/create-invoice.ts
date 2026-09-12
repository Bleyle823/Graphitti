import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { StripeCredentials } from "../credentials";
import { normalizeStripeCustomerField } from "../resolve-customer-fields";
import { createStripeCustomer } from "./create-customer";

const STRIPE_API_URL = "https://api.stripe.com/v1";

type StripeInvoiceResponse = {
  id: string;
  number: string | null;
  hosted_invoice_url: string | null;
  status: string;
};

type StripeErrorResponse = {
  error: {
    type: string;
    message: string;
    code?: string;
  };
};

type LineItem = {
  description: string;
  amount: number;
  quantity?: number;
};

type CreateInvoiceResult =
  | {
      success: true;
      data: {
        id: string;
        number: string | null;
        hostedInvoiceUrl: string | null;
        status: string;
      };
    }
  | ReturnType<typeof fail>;

export type CreateInvoiceCoreInput = {
  customerId?: string;
  email?: string;
  name?: string;
  description?: string;
  lineItems: string;
  daysUntilDue?: number;
  autoAdvance?: string;
  collectionMethod?: "send_invoice" | "charge_automatically";
  metadata?: string;
};

export type CreateInvoiceInput = StepInput &
  CreateInvoiceCoreInput & {
    integrationId?: string;
  };

async function resolveCustomerId(
  input: CreateInvoiceCoreInput,
  credentials: StripeCredentials
): Promise<{ ok: true; customerId: string } | ReturnType<typeof fail>> {
  const customerId = normalizeStripeCustomerField(input.customerId);
  if (customerId) {
    return { ok: true, customerId };
  }

  const email = normalizeStripeCustomerField(input.email);
  if (!email) {
    return fail(
      "Customer ID is required, or provide email (and optional name) to create a Stripe customer before invoicing"
    );
  }

  const created = await createStripeCustomer(
    { email, name: input.name },
    credentials
  );
  if (!created.success) {
    return created;
  }
  return { ok: true, customerId: created.data.id };
}

async function stepHandler(
  input: CreateInvoiceCoreInput,
  credentials: StripeCredentials
): Promise<CreateInvoiceResult> {
  const apiKey = credentials.STRIPE_SECRET_KEY;

  if (!apiKey) {
    return fail(
      "STRIPE_SECRET_KEY is not configured. Please add it in Project Integrations."
    );
  }

  let lineItems: LineItem[];
  try {
    lineItems = JSON.parse(input.lineItems) as LineItem[];
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return fail("Line items must be a non-empty JSON array");
    }
  } catch {
    return fail(
      'Invalid line items JSON format. Expected: [{"description": "Item", "amount": 1000, "quantity": 1}]'
    );
  }

  const customerResolved = await resolveCustomerId(input, credentials);
  if (!("customerId" in customerResolved)) {
    return customerResolved;
  }
  const customerId = customerResolved.customerId;

  try {
    const invoiceParams = new URLSearchParams();
    invoiceParams.append("customer", customerId);
    invoiceParams.append(
      "collection_method",
      input.collectionMethod || "send_invoice"
    );
    invoiceParams.append(
      "days_until_due",
      String(input.daysUntilDue || 30)
    );
    invoiceParams.append(
      "auto_advance",
      input.autoAdvance === "false" ? "false" : "true"
    );

    if (input.description) {
      invoiceParams.append("description", input.description);
    }
    if (input.metadata) {
      try {
        const metadataObj = JSON.parse(input.metadata) as Record<
          string,
          string
        >;
        for (const [key, value] of Object.entries(metadataObj)) {
          invoiceParams.append(`metadata[${key}]`, String(value));
        }
      } catch {
        return fail("Invalid metadata JSON format");
      }
    }

    const invoiceResponse = await fetch(`${STRIPE_API_URL}/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: invoiceParams.toString(),
    });

    if (!invoiceResponse.ok) {
      const errorData = (await invoiceResponse.json()) as StripeErrorResponse;
      return fail(
        errorData.error?.message ||
          `HTTP ${invoiceResponse.status}: Failed to create invoice`
      );
    }

    const invoice = (await invoiceResponse.json()) as StripeInvoiceResponse;

    for (const item of lineItems) {
      const itemParams = new URLSearchParams();
      itemParams.append("invoice", invoice.id);
      itemParams.append("description", item.description);
      itemParams.append("quantity", String(item.quantity || 1));
      itemParams.append("unit_amount", String(item.amount));
      itemParams.append("currency", "usd");

      const itemResponse = await fetch(`${STRIPE_API_URL}/invoiceitems`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: itemParams.toString(),
      });

      if (!itemResponse.ok) {
        const errorData = (await itemResponse.json()) as StripeErrorResponse;
        return fail(
          errorData.error?.message ||
            `HTTP ${itemResponse.status}: Failed to add line item`
        );
      }
    }

    let finalInvoice = invoice;
    if (input.autoAdvance !== "false") {
      const finalizeResponse = await fetch(
        `${STRIPE_API_URL}/invoices/${invoice.id}/finalize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (!finalizeResponse.ok) {
        const errorData =
          (await finalizeResponse.json()) as StripeErrorResponse;
        return fail(
          errorData.error?.message ||
            `HTTP ${finalizeResponse.status}: Failed to finalize invoice`
        );
      }

      finalInvoice = (await finalizeResponse.json()) as StripeInvoiceResponse;
    }

    return ok({
      id: finalInvoice.id,
      number: finalInvoice.number,
      hostedInvoiceUrl: finalInvoice.hosted_invoice_url,
      status: finalInvoice.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Failed to create invoice: ${message}`);
  }
}

export async function createInvoiceStep(
  input: CreateInvoiceInput
): Promise<CreateInvoiceResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createInvoiceStep.maxRetries = 0;

export const _integrationType = "stripe";
