import "server-only";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationWallets, orgSpendReservations } from "@/lib/db/schema";
import { generateId } from "@/lib/utils/id";
import {
  formatUsdcFromMicro,
  parseUsdcToMicro,
  wouldExceedDailyCap,
  wouldExceedPerTxCap,
} from "./spend-cap";

export type SpendReservationResult =
  | { success: true; reservationId: string }
  | { success: false; error: string };

function startOfUtcDay(date = new Date()): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export async function getDailySpendUsedUsdc(
  organizationId: string
): Promise<string> {
  const since = startOfUtcDay();
  const rows = await db
    .select({ amountUsdc: orgSpendReservations.amountUsdc })
    .from(orgSpendReservations)
    .where(
      and(
        eq(orgSpendReservations.organizationId, organizationId),
        inArray(orgSpendReservations.status, ["reserved", "settled"]),
        gte(orgSpendReservations.createdAt, since)
      )
    );

  let total = BigInt(0);
  for (const row of rows) {
    total += parseUsdcToMicro(row.amountUsdc);
  }
  return formatUsdcFromMicro(total);
}

export async function reserveOrgSpend(input: {
  organizationId: string;
  amountUsdc: string;
  source: string;
  ref: string;
  enforcePerTxCap?: boolean;
}): Promise<SpendReservationResult> {
  return await db.transaction(async (tx) => {
    const wallets = await tx
      .select()
      .from(organizationWallets)
      .where(
        and(
          eq(organizationWallets.organizationId, input.organizationId),
          eq(organizationWallets.isActive, true)
        )
      )
      .for("update")
      .limit(1);

    const wallet = wallets[0];
    if (!wallet) {
      return { success: false, error: "Treasury wallet is not provisioned" };
    }

    if (
      input.enforcePerTxCap !== false &&
      wouldExceedPerTxCap(input.amountUsdc, wallet.autoSpendCapUsdc)
    ) {
      return {
        success: false,
        error: `Amount exceeds auto spend cap of ${wallet.autoSpendCapUsdc} USDC`,
      };
    }

    const since = startOfUtcDay();
    const usedRows = await tx
      .select({
        total: sql<string>`coalesce(sum(${orgSpendReservations.amountUsdc}), '0')`,
      })
      .from(orgSpendReservations)
      .where(
        and(
          eq(orgSpendReservations.organizationId, input.organizationId),
          inArray(orgSpendReservations.status, ["reserved", "settled"]),
          gte(orgSpendReservations.createdAt, since)
        )
      );

    const usedToday = usedRows[0]?.total ?? "0";
    if (
      wouldExceedDailyCap(usedToday, input.amountUsdc, wallet.dailySpendCapUsdc)
    ) {
      return {
        success: false,
        error: `Amount would exceed daily spend cap of ${wallet.dailySpendCapUsdc} USDC`,
      };
    }

    const reservationId = generateId();
    await tx.insert(orgSpendReservations).values({
      id: reservationId,
      organizationId: input.organizationId,
      amountUsdc: input.amountUsdc,
      status: "reserved",
      source: input.source,
      ref: input.ref,
    });

    return { success: true, reservationId };
  });
}

export async function settleOrgSpend(reservationId: string): Promise<void> {
  await db
    .update(orgSpendReservations)
    .set({ status: "settled", updatedAt: new Date() })
    .where(eq(orgSpendReservations.id, reservationId));
}

export async function releaseOrgSpend(reservationId: string): Promise<void> {
  await db
    .update(orgSpendReservations)
    .set({ status: "released", updatedAt: new Date() })
    .where(eq(orgSpendReservations.id, reservationId));
}

export async function releaseOrgSpendByRef(ref: string): Promise<void> {
  await db
    .update(orgSpendReservations)
    .set({ status: "released", updatedAt: new Date() })
    .where(eq(orgSpendReservations.ref, ref));
}

export async function settleOrgSpendByRef(ref: string): Promise<void> {
  await db
    .update(orgSpendReservations)
    .set({ status: "settled", updatedAt: new Date() })
    .where(eq(orgSpendReservations.ref, ref));
}

export async function updateOrgSpendRef(
  reservationId: string,
  ref: string
): Promise<void> {
  await db
    .update(orgSpendReservations)
    .set({ ref, updatedAt: new Date() })
    .where(eq(orgSpendReservations.id, reservationId));
}
