import "server-only";

import { randomUUID } from "node:crypto";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { fail, ok } from "@/lib/http-json";
import { recordOrganizationIntent } from "@/lib/org/record-intent";
import {
  releaseOrgSpend,
  reserveOrgSpend,
  settleOrgSpend,
  updateOrgSpendRef,
} from "@/lib/org/spend-ledger";
import { assertOrgPayeeAllowed } from "@/lib/privy/payee-guard";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import {
  createPrivyKeyQuorum,
  createPrivyPolicy,
  createPrivyTransferIntent,
  getPrivyIntent,
  privyWalletSwap,
  privyWalletTransfer,
  type WalletTransferRequest,
} from "@/lib/web3/privy-client";
import { resolveOrganizationContext } from "@/lib/web3/resolve-org-context";
import { resolveStepWalletId } from "@/lib/web3/resolve-workflow-wallet";
import { applyPrivyCredentials } from "../credentials";

type PrivyStepInput = StepInput & {
  integrationId?: string;
};

async function requirePrivyAuth(input: PrivyStepInput) {
  const fetched = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};
  return applyPrivyCredentials(fetched);
}

export type WalletTransferInput = PrivyStepInput & {
  walletId: string;
  sourceChain: string;
  sourceAsset: string;
  amount: string;
  destinationAddress: string;
  destinationChain?: string;
  destinationAsset?: string;
  useIntent?: string;
};

export type WalletSwapInput = PrivyStepInput & {
  walletId: string;
  chain: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
};

export type CreatePolicyInput = PrivyStepInput & {
  name: string;
  chainType?: string;
  rulesJson: string;
  ownerId?: string;
};

export type CreateKeyQuorumInput = PrivyStepInput & {
  displayName: string;
  authorizationThreshold: string;
  userIdsJson?: string;
};

export type CreateTransferIntentInput = PrivyStepInput & {
  walletId: string;
  sourceChain: string;
  sourceAsset: string;
  amount: string;
  destinationAddress: string;
  destinationChain?: string;
  destinationAsset?: string;
};

export type GetIntentInput = PrivyStepInput & {
  intentId: string;
};

async function maybeRecordIntent(
  input: PrivyStepInput,
  intent: { intent_id: string },
  transferInput: Pick<
    WalletTransferInput,
    "amount" | "destinationAddress"
  >
) {
  const orgContext = await resolveOrganizationContext(
    input._context ?? {},
    "[Privy]",
    "wallet-transfer"
  );
  if (!orgContext.success) {
    return;
  }
  await recordOrganizationIntent({
    organizationId: orgContext.organizationId,
    privyIntentId: intent.intent_id,
    amountUsdc: transferInput.amount,
    toAddress: transferInput.destinationAddress,
    workflowExecutionId: input._context?.executionId,
  });
}

function buildTransferBody(
  input: Pick<
    WalletTransferInput,
    | "sourceChain"
    | "sourceAsset"
    | "amount"
    | "destinationAddress"
    | "destinationChain"
    | "destinationAsset"
  >
): WalletTransferRequest {
  const destinationAddress = input.destinationAddress.trim().toLowerCase();
  return {
    source: {
      chain: input.sourceChain,
      asset: input.sourceAsset,
      amount: input.amount,
    },
    destination: {
      address: destinationAddress,
      ...(input.destinationChain ? { chain: input.destinationChain } : {}),
      ...(input.destinationAsset ? { asset: input.destinationAsset } : {}),
    },
    amount: input.amount,
    amount_type: "exact_input",
    nonce: randomUUID(),
    reference_id: randomUUID(),
  };
}

async function maybeReserveOrgSpend(input: {
  context: PrivyStepInput["_context"];
  amountUsdc: string;
  source: string;
  ref: string;
  enforcePerTxCap: boolean;
}): Promise<
  | { success: true; reservationId: string | null }
  | { success: false; error: string }
> {
  const orgContext = await resolveOrganizationContext(
    input.context ?? {},
    "[Privy]",
    input.source
  );
  if (!orgContext.success) {
    return { success: true, reservationId: null };
  }

  const reserved = await reserveOrgSpend({
    organizationId: orgContext.organizationId,
    amountUsdc: input.amountUsdc,
    source: input.source,
    ref: input.ref,
    enforcePerTxCap: input.enforcePerTxCap,
  });
  if (!reserved.success) {
    return reserved;
  }
  return { success: true, reservationId: reserved.reservationId };
}

async function finishReservation(
  reservationId: string | null,
  outcome: "settled" | "released"
): Promise<void> {
  if (!reservationId) {
    return;
  }
  if (outcome === "settled") {
    await settleOrgSpend(reservationId);
    return;
  }
  await releaseOrgSpend(reservationId);
}

async function walletTransfer(input: WalletTransferInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  if (!(wallet.walletId && input.destinationAddress && input.amount)) {
    return fail("walletId, destinationAddress, and amount are required");
  }

  const payeeGate = await assertOrgPayeeAllowed(
    wallet.walletId,
    input.destinationAddress
  );
  if (!payeeGate.success) {
    return fail(payeeGate.error);
  }

  const useIntent =
    input.useIntent === "true" ||
    input.useIntent === "yes" ||
    input.useIntent === "1";
  const spendRef = randomUUID();
  const reserved = await maybeReserveOrgSpend({
    context: input._context,
    amountUsdc: input.amount,
    source: useIntent ? "wallet-transfer-intent" : "wallet-transfer",
    ref: spendRef,
    enforcePerTxCap: !useIntent,
  });
  if (!reserved.success) {
    return fail(reserved.error);
  }

  try {
    const body = buildTransferBody(input);

    if (useIntent) {
      const intent = await createPrivyTransferIntent(wallet.walletId, body);
      if (reserved.reservationId) {
        await updateOrgSpendRef(
          reserved.reservationId,
          `intent:${intent.intent_id}`
        );
      }
      await maybeRecordIntent(input, intent, input);
      return ok({
        intent_id: intent.intent_id,
        status: intent.status,
        mode: "intent",
      });
    }

    const action = await privyWalletTransfer(wallet.walletId, body);
    await finishReservation(reserved.reservationId, "settled");
    return ok({
      id: action.id,
      status: action.status,
      transaction_hash: action.transaction_hash,
      mode: "direct",
    });
  } catch (error) {
    await finishReservation(reserved.reservationId, "released");
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function walletSwap(input: WalletSwapInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  const wallet = await resolveStepWalletId(input);
  if (!wallet.success) {
    return fail(wallet.error);
  }
  if (!(wallet.walletId && input.fromAsset && input.toAsset && input.amount)) {
    return fail("walletId, fromAsset, toAsset, and amount are required");
  }

  const spendRef = randomUUID();
  const reserved = await maybeReserveOrgSpend({
    context: input._context,
    amountUsdc: input.amount,
    source: "wallet-swap",
    ref: spendRef,
    enforcePerTxCap: true,
  });
  if (!reserved.success) {
    return fail(reserved.error);
  }

  try {
    const action = await privyWalletSwap(wallet.walletId, {
      chain: input.chain || "base_sepolia",
      from_asset: input.fromAsset,
      to_asset: input.toAsset,
      amount: input.amount,
      nonce: randomUUID(),
      reference_id: randomUUID(),
    });
    await finishReservation(reserved.reservationId, "settled");
    return ok({
      id: action.id,
      status: action.status,
      transaction_hash: action.transaction_hash,
    });
  } catch (error) {
    await finishReservation(reserved.reservationId, "released");
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function createPolicy(input: CreatePolicyInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!(input.name && input.rulesJson)) {
    return fail("name and rulesJson are required");
  }

  try {
    const rules = JSON.parse(input.rulesJson) as Record<string, unknown>[];
    const policy = await createPrivyPolicy({
      name: input.name,
      chainType: input.chainType || "ethereum",
      rules,
      ownerId: input.ownerId,
    });
    return ok({ id: policy.id, name: policy.name });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function createKeyQuorum(input: CreateKeyQuorumInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!(input.displayName && input.authorizationThreshold)) {
    return fail("displayName and authorizationThreshold are required");
  }

  try {
    const userIds = input.userIdsJson
      ? (JSON.parse(input.userIdsJson) as string[])
      : undefined;
    const quorum = await createPrivyKeyQuorum({
      displayName: input.displayName,
      authorizationThreshold: Number.parseInt(input.authorizationThreshold, 10),
      userIds,
    });
    return ok({ id: quorum.id, display_name: quorum.display_name });
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function createTransferIntent(input: CreateTransferIntentInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!(input.walletId && input.destinationAddress && input.amount)) {
    return fail("walletId, destinationAddress, and amount are required");
  }

  const spendRef = randomUUID();
  const reserved = await maybeReserveOrgSpend({
    context: input._context,
    amountUsdc: input.amount,
    source: "create-transfer-intent",
    ref: spendRef,
    enforcePerTxCap: false,
  });
  if (!reserved.success) {
    return fail(reserved.error);
  }

  try {
    const intent = await createPrivyTransferIntent(
      input.walletId,
      buildTransferBody(input)
    );
    if (reserved.reservationId) {
      await updateOrgSpendRef(
        reserved.reservationId,
        `intent:${intent.intent_id}`
      );
    }
    await maybeRecordIntent(input, intent, input);
    return ok({
      intent_id: intent.intent_id,
      status: intent.status,
    });
  } catch (error) {
    await finishReservation(reserved.reservationId, "released");
    return fail(error instanceof Error ? error.message : String(error));
  }
}

async function getIntent(input: GetIntentInput) {
  const authError = await requirePrivyAuth(input);
  if (authError) {
    return authError;
  }
  if (!input.intentId) {
    return fail("intentId is required");
  }

  try {
    const intent = await getPrivyIntent(input.intentId);
    return ok(intent);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export async function walletTransferStep(input: WalletTransferInput) {
  "use step";
  return withStepLogging(input, () => walletTransfer(input));
}

export async function walletSwapStep(input: WalletSwapInput) {
  "use step";
  return withStepLogging(input, () => walletSwap(input));
}

export async function createPolicyStep(input: CreatePolicyInput) {
  "use step";
  return withStepLogging(input, () => createPolicy(input));
}

export async function createKeyQuorumStep(input: CreateKeyQuorumInput) {
  "use step";
  return withStepLogging(input, () => createKeyQuorum(input));
}

export async function createTransferIntentStep(input: CreateTransferIntentInput) {
  "use step";
  return withStepLogging(input, () => createTransferIntent(input));
}

export async function getIntentStep(input: GetIntentInput) {
  "use step";
  return withStepLogging(input, () => getIntent(input));
}

export const _integrationType = "privy";
