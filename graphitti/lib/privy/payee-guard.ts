import "server-only";

import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { db } from "@/lib/db";
import { organizationWallets } from "@/lib/db/schema";
import { listOrgPayees } from "@/lib/org/auth-helpers";

export async function assertOrgPayeeAllowed(
  walletId: string,
  destinationAddress: string
): Promise<{ success: true } | { success: false; error: string }> {
  const treasury = await db.query.organizationWallets.findFirst({
    where: eq(organizationWallets.privyWalletId, walletId),
  });
  if (!treasury) {
    return { success: true };
  }

  const payees = await listOrgPayees(treasury.organizationId);
  if (payees.length === 0) {
    return { success: true };
  }

  if (!ethers.isAddress(destinationAddress)) {
    return { success: false, error: "Invalid destination address" };
  }

  const destination = destinationAddress.toLowerCase();
  if (payees.some((payee) => payee.address.toLowerCase() === destination)) {
    return { success: true };
  }

  return {
    success: false,
    error:
      "Destination is not in the organization payee book. Add this address in Treasury first.",
  };
}
