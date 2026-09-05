import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { userWallets, workflows } from "@/lib/db/schema";
import {
  buildArcPaymentRequired,
  extractTxHash,
  paymentHashFromReceipt,
  recordWorkflowPayment,
} from "@/lib/marketplace/x402";
import { mapOutputs, startListedWorkflow, waitForExecution } from "@/lib/marketplace/run-workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, PAYMENT-SIGNATURE, PAYMENT-RESPONSE",
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
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
      { status: 404, headers: corsHeaders }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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
            { status: 400, headers: corsHeaders }
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
          { status: 400, headers: corsHeaders }
        );
      }
      const challenge = buildArcPaymentRequired({
        priceUsdc: String(workflow.priceUsdcPerCall),
        payTo: creator.address,
        resource: `/api/mcp/workflows/${slug}/call`,
      });
      return NextResponse.json(
        { error: "Payment required", ...challenge },
        {
          status: 402,
          headers: {
            ...corsHeaders,
            "PAYMENT-REQUIRED": JSON.stringify(challenge),
          },
        }
      );
    }

    const receipt = (() => {
      try {
        return JSON.parse(paymentHeader);
      } catch {
        return paymentHeader;
      }
    })();
    await recordWorkflowPayment({
      workflowId: workflow.id,
      amountUsdc: String(workflow.priceUsdcPerCall),
      paymentHash: paymentHashFromReceipt(receipt),
      txHash: extractTxHash(receipt),
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
      { headers: corsHeaders }
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
    { headers: corsHeaders }
  );
}
