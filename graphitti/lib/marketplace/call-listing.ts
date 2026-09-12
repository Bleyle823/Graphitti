import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { userWallets, workflows } from "@/lib/db/schema";
import {
  mapOutputs,
  startListedWorkflow,
  waitForExecution,
} from "@/lib/marketplace/run-workflow";
import {
  buildCircleNanopayRequired,
  encodeX402Header,
  extractPayer,
  extractTxHash,
  paymentHashFromReceipt,
  recordWorkflowPayment,
} from "@/lib/marketplace/x402";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { verifyMarketplacePayment } from "./verify-payment";

export const listingCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, PAYMENT-SIGNATURE, PAYMENT-RESPONSE",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
};

function paymentRequiredResponse(
  challenge: ReturnType<typeof buildCircleNanopayRequired>,
  error: string
): NextResponse {
  return NextResponse.json(
    { error, ...challenge },
    {
      status: 402,
      headers: {
        ...listingCorsHeaders,
        "PAYMENT-REQUIRED": encodeX402Header(challenge),
      },
    }
  );
}

async function enforceListingPayment(options: {
  workflow: typeof workflows.$inferSelect;
  slug: string;
  isOwner: boolean;
  request: Request;
}): Promise<
  | { ok: true; paymentResponseHeader?: string }
  | { ok: false; response: NextResponse }
> {
  const price = Number(options.workflow.priceUsdcPerCall ?? 0);
  if (price <= 0 || options.isOwner) {
    return { ok: true };
  }

  const paymentHeader =
    options.request.headers.get("PAYMENT-SIGNATURE") ||
    options.request.headers.get("PAYMENT-RESPONSE");

  const creator = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, options.workflow.userId),
  });
  if (!creator) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Listing owner has no payout wallet" },
        { status: 400, headers: listingCorsHeaders }
      ),
    };
  }

  const challenge = buildCircleNanopayRequired({
    priceUsdc: String(options.workflow.priceUsdcPerCall),
    payTo: creator.address,
    resource: `/api/mcp/workflows/${options.slug}/call`,
    description: options.workflow.name,
  });

  if (!paymentHeader) {
    return {
      ok: false,
      response: paymentRequiredResponse(challenge, "Payment required"),
    };
  }

  const requirement = challenge.accepts[0];
  if (!requirement) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Payment requirements unavailable" },
        { status: 500, headers: listingCorsHeaders }
      ),
    };
  }

  const verified = await verifyMarketplacePayment({
    paymentHeader,
    requirements: requirement,
  });

  if (!verified.valid) {
    return {
      ok: false,
      response: paymentRequiredResponse(
        challenge,
        "Payment verification failed"
      ),
    };
  }

  await recordWorkflowPayment({
    workflowId: options.workflow.id,
    caller: verified.payer ?? extractPayer(verified.receipt),
    amountUsdc: String(options.workflow.priceUsdcPerCall),
    paymentHash: paymentHashFromReceipt(verified.receipt),
    txHash: verified.txHash ?? extractTxHash(verified.receipt),
  });

  return {
    ok: true,
    paymentResponseHeader: encodeX402Header({
      success: true,
      transaction: verified.txHash ?? extractTxHash(verified.receipt) ?? "",
      network: requirement.network,
      payer: verified.payer ?? extractPayer(verified.receipt) ?? "",
    }),
  };
}

function listingInputFromBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  if (body.input && typeof body.input === "object") {
    return body.input as Record<string, unknown>;
  }
  return body;
}

function missingRequiredField(
  schema: Record<string, unknown> | null,
  input: Record<string, unknown>
): string | null {
  const required = schema?.required;
  if (!Array.isArray(required)) {
    return null;
  }
  for (const field of required) {
    if (typeof field === "string" && !(field in input)) {
      return field;
    }
  }
  return null;
}

export async function executeListingCall(
  slug: string,
  request: Request
): Promise<NextResponse> {
  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.listedSlug, slug),
      eq(workflows.isListed, true),
      isNull(workflows.deletedAt)
    ),
  });

  if (!workflow) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404, headers: listingCorsHeaders }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const input = listingInputFromBody(body);
  const missing = missingRequiredField(
    workflow.inputSchema as Record<string, unknown> | null,
    input
  );
  if (missing) {
    return NextResponse.json(
      { error: `Missing required field: ${missing}` },
      { status: 400, headers: listingCorsHeaders }
    );
  }

  const authHeader = request.headers.get("Authorization");
  const ownerKey = await validateApiKey(authHeader, workflow.userId);
  const isOwner = ownerKey.valid;
  const payment = await enforceListingPayment({
    workflow,
    slug,
    isOwner,
    request,
  });
  if (!payment.ok) {
    return payment.response;
  }

  if (workflow.workflowType === "write" && !isOwner) {
    return NextResponse.json(
      {
        instructionOnly: true,
        to: null,
        data: null,
        value: "0x0",
        message:
          "Write listings return an unsigned instruction unless you are the owner calling with an API key.",
      },
      { headers: listingCorsHeaders }
    );
  }

  const executionId = await startListedWorkflow({
    workflowId: workflow.id,
    userId: workflow.userId,
    nodes: workflow.nodes as WorkflowNode[],
    edges: workflow.edges as WorkflowEdge[],
    input,
  });

  const result = await waitForExecution(executionId);
  return NextResponse.json(
    {
      executionId,
      status: result.status,
      output: mapOutputs(result.output, workflow.outputMapping),
      error: result.error,
    },
    {
      headers: {
        ...listingCorsHeaders,
        ...(payment.paymentResponseHeader
          ? { "PAYMENT-RESPONSE": payment.paymentResponseHeader }
          : {}),
      },
    }
  );
}
