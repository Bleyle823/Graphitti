import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizationIntents, workflowExecutions } from "@/lib/db/schema";

type PrivyWebhookPayload = {
  type?: string;
  data?: {
    intent_id?: string;
    status?: string;
    transaction_hash?: string;
  };
};

function mapIntentStatus(
  status: string | undefined
): (typeof organizationIntents.$inferSelect)["status"] {
  switch (status) {
    case "executed":
      return "executed";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "rejected":
      return "rejected";
    case "dismissed":
      return "dismissed";
    case "processing":
      return "processing";
    default:
      return "pending";
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as PrivyWebhookPayload;
  const eventType = payload.type ?? "";
  const intentId = payload.data?.intent_id;

  if (!intentId) {
    return NextResponse.json({ received: true });
  }

  const intentRow = await db.query.organizationIntents.findFirst({
    where: eq(organizationIntents.privyIntentId, intentId),
  });

  if (!intentRow) {
    return NextResponse.json({ received: true });
  }

  const nextStatus = mapIntentStatus(payload.data?.status);
  await db
    .update(organizationIntents)
    .set({
      status: nextStatus,
      txHash: payload.data?.transaction_hash ?? intentRow.txHash,
      updatedAt: new Date(),
    })
    .where(eq(organizationIntents.id, intentRow.id));

  if (
    intentRow.workflowExecutionId &&
    (eventType.includes("intent.executed") || nextStatus === "executed")
  ) {
    await db
      .update(workflowExecutions)
      .set({
        status: "running",
        completedAt: null,
      })
      .where(eq(workflowExecutions.id, intentRow.workflowExecutionId));
  }

  return NextResponse.json({ received: true });
}
