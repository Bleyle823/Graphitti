import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { userWallets, workflows } from "@/lib/db/schema";
import {
  buildArcPaymentRequired,
  buildCircleNanopayRequired,
  extractTxHash,
  paymentHashFromReceipt,
  recordWorkflowPayment,
} from "@/lib/marketplace/x402";
import {
  mapOutputs,
  startListedWorkflow,
  waitForExecution,
} from "@/lib/marketplace/run-workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { verifyMarketplacePayment } from "./verify-payment";

export const listingCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, PAYMENT-SIGNATURE, PAYMENT-RESPONSE",
};

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
  const input =
    body.input && typeof body.input === "object"
      ? (body.input as Record<string, unknown>)
      : body;

  if (workflow.inputSchema && typeof workflow.inputSchema === "object") {
    const required = (workflow.inputSchema as { required?: unknown }).required;
    if (Array.isArray(required)) {
      for (const field of required) {
        if (typeof field === "string" && !(field in input)) {
          return NextResponse.json(
            { error: `Missing required field: ${field}` },
            { status: 400, headers: listingCorsHeaders }
          );
        }
      }
    }
  }

  const authHeader = request.headers.get("Authorization");
  const ownerKey = await validateApiKey(authHeader, workflow.userId);
  const isOwner = ownerKey.valid;

  const price = Number(workflow.priceUsdcPerCall ?? 0);
  if (price > 0 && !isOwner) {
    const paymentHeader =
      request.headers.get("PAYMENT-SIGNATURE") ||
      request.headers.get("PAYMENT-RESPONSE");

    if (!paymentHeader) {
      const creator = await db.query.userWallets.findFirst({
        where: eq(userWallets.userId, workflow.userId),
      });
      if (!creator) {
        return NextResponse.json(
          { error: "Listing owner has no payout wallet" },
          { status: 400, headers: listingCorsHeaders }
        );
      }

      const resource = `/api/mcp/workflows/${slug}/call`;
      const arcChallenge = buildArcPaymentRequired({
        priceUsdc: String(workflow.priceUsdcPerCall),
        payTo: creator.address,
        resource,
      });
      const circleChallenge = buildCircleNanopayRequired({
        priceUsdc: String(workflow.priceUsdcPerCall),
        payTo: creator.address,
        resource,
      });

      const challenge = {
        accepts: [...arcChallenge.accepts, ...circleChallenge.accepts],
      };

      return NextResponse.json(
        { error: "Payment required", ...challenge },
        {
          status: 402,
          headers: {
            ...listingCorsHeaders,
            "PAYMENT-REQUIRED": JSON.stringify(challenge),
          },
        }
      );
    }

    const creator = await db.query.userWallets.findFirst({
      where: eq(userWallets.userId, workflow.userId),
    });
    if (!creator) {
      return NextResponse.json(
        { error: "Listing owner has no payout wallet" },
        { status: 400, headers: listingCorsHeaders }
      );
    }

    const verified = await verifyMarketplacePayment({
      paymentHeader,
      payTo: creator.address,
      priceUsdc: String(workflow.priceUsdcPerCall),
    });

    if (!verified.valid) {
      return NextResponse.json(
        { error: "Payment verification failed" },
        { status: 402, headers: listingCorsHeaders }
      );
    }

    await recordWorkflowPayment({
      workflowId: workflow.id,
      amountUsdc: String(workflow.priceUsdcPerCall),
      paymentHash: paymentHashFromReceipt(verified.receipt),
      txHash: verified.txHash ?? extractTxHash(verified.receipt),
    });
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
    { headers: listingCorsHeaders }
  );
}
