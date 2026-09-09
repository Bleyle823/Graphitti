import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type OrganizationWallet, organizationWallets } from "@/lib/db/schema";

export async function getOrganizationWallet(
  organizationId: string
): Promise<OrganizationWallet> {
  const wallet = await db
    .select()
    .from(organizationWallets)
    .where(
      and(
        eq(organizationWallets.organizationId, organizationId),
        eq(organizationWallets.isActive, true)
      )
    )
    .limit(1);

  if (wallet.length === 0) {
    throw new Error("No treasury wallet found for organization");
  }

  return wallet[0];
}

export async function getOrganizationWalletAddress(
  organizationId: string
): Promise<string> {
  const wallet = await getOrganizationWallet(organizationId);
  return wallet.address;
}

export async function organizationHasWallet(
  organizationId: string
): Promise<boolean> {
  const wallet = await db
    .select({ id: organizationWallets.id })
    .from(organizationWallets)
    .where(
      and(
        eq(organizationWallets.organizationId, organizationId),
        eq(organizationWallets.isActive, true)
      )
    )
    .limit(1);

  return wallet.length > 0;
}

export async function getOrganizationPrivyWalletId(
  organizationId: string
): Promise<string> {
  const wallet = await getOrganizationWallet(organizationId);
  return wallet.privyWalletId;
}
