import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workflowPayments, workflows } from "@/lib/db/schema";
import { getPlatformFeeBps } from "@/lib/marketplace/constants";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await db
    .select({ id: workflows.id, listedSlug: workflows.listedSlug, name: workflows.name })
    .from(workflows)
    .where(eq(workflows.userId, session.user.id));

  const ids = owned.map((row) => row.id);
  if (ids.length === 0) {
    return NextResponse.json({
      invocations: 0,
      grossUsdc: "0",
      platformFeeBps: getPlatformFeeBps(),
      netUsdc: "0",
      rows: [],
    });
  }

  const payments = await db
    .select()
    .from(workflowPayments)
    .where(inArray(workflowPayments.workflowId, ids))
    .orderBy(desc(workflowPayments.createdAt));

  const gross = payments.reduce((sum, row) => sum + Number(row.amountUsdc || 0), 0);
  const feeBps = getPlatformFeeBps();
  const net = gross * (1 - feeBps / 10_000);

  return NextResponse.json({
    invocations: payments.length,
    grossUsdc: gross.toFixed(6),
    platformFeeBps: feeBps,
    netUsdc: net.toFixed(6),
    chain: "arc-testnet",
    asset: "USDC",
    rows: payments.map((row) => ({
      id: row.id,
      workflowId: row.workflowId,
      amountUsdc: row.amountUsdc,
      txHash: row.txHash,
      createdAt: row.createdAt,
    })),
  });
}
