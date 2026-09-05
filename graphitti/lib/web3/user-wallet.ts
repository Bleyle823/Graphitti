import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userWallets, workflowExecutions } from "@/lib/db/schema";

export type LinkedWallet = {
  id: string;
  userId: string;
  privyUserId: string | null;
  privyWalletId: string;
  address: string;
  chainType: string;
};

export async function getUserIdFromExecution(
  executionId: string | undefined
): Promise<string | undefined> {
  if (!executionId) {
    return;
  }

  const execution = await db.query.workflowExecutions.findFirst({
    where: eq(workflowExecutions.id, executionId),
    columns: { userId: true },
  });

  return execution?.userId;
}

export async function getLinkedWallet(
  userId: string
): Promise<LinkedWallet | undefined> {
  const wallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, userId),
  });

  return wallet;
}

export const NO_WALLET_ERROR = {
  success: false as const,
  error: {
    message:
      "No Privy wallet is linked. Open the auth dialog and choose Connect wallet, then try again.",
  },
};

export async function requireLinkedWalletForExecution(
  executionId: string | undefined
): Promise<
  | { success: true; wallet: LinkedWallet }
  | { success: false; error: { message: string } }
> {
  const userId = await getUserIdFromExecution(executionId);
  if (!userId) {
    return {
      success: false,
      error: {
        message:
          "Could not resolve the workflow owner. Run this workflow from the app after signing in.",
      },
    };
  }

  const wallet = await getLinkedWallet(userId);
  if (!wallet) {
    return NO_WALLET_ERROR;
  }

  return { success: true, wallet };
}
