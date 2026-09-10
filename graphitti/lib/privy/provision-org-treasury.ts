import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userWallets } from "@/lib/db/schema";
import {
  createPrivyKeyQuorum,
  createPrivyOrganization,
  createPrivyOrgWallet,
  createPrivyPolicy,
  getPrivyOperatorSignerId,
} from "@/lib/web3/privy-client";

const DEFAULT_AUTO_SPEND_CAP = "50";
const TREASURY_CHAIN = "base_sepolia";

function buildAutoTransferPolicyRules(
  spendCapUsdc: string,
  allowlistedAddresses: string[] = []
) {
  const recipientCondition =
    allowlistedAddresses.length > 0
      ? {
          field_source: "action_request_body",
          field: "destination.address",
          operator: "in",
          value: allowlistedAddresses,
        }
      : null;

  const rules: Record<string, unknown>[] = [
    {
      name: "Allow small USDC transfers",
      method: "transfer",
      action: "ALLOW",
      conditions: [
        {
          field_source: "action_request_body",
          field: "source.chain",
          operator: "eq",
          value: TREASURY_CHAIN,
        },
        {
          field_source: "action_request_body",
          field: "source.asset",
          operator: "eq",
          value: "usdc",
        },
        {
          field_source: "action_request_body",
          field: "amount",
          operator: "lte",
          value: spendCapUsdc,
        },
        ...(recipientCondition ? [recipientCondition] : []),
      ],
    },
    {
      name: "Deny other transfer actions",
      method: "transfer",
      action: "DENY",
      conditions: [],
    },
  ];

  return rules;
}

function buildOwnerTransferPolicyRules() {
  return [
    {
      name: "Allow owner USDC transfers",
      method: "transfer",
      action: "ALLOW",
      conditions: [
        {
          field_source: "action_request_body",
          field: "source.asset",
          operator: "eq",
          value: "usdc",
        },
      ],
    },
    {
      name: "Allow owner swaps",
      method: "*",
      action: "ALLOW",
      conditions: [],
    },
  ];
}

export type ProvisionOrgTreasuryInput = {
  organizationId: string;
  organizationName: string;
  creatorUserId: string;
  autoSpendCapUsdc?: string;
};

export type ProvisionOrgTreasuryResult = {
  privyOrganizationId: string;
  ownerQuorumId: string;
  operatorSignerId: string;
  autoPolicyId: string;
  humanPolicyId: string;
  privyWalletId: string;
  address: string;
};

export async function provisionOrgTreasury(
  input: ProvisionOrgTreasuryInput
): Promise<ProvisionOrgTreasuryResult> {
  const spendCap = input.autoSpendCapUsdc ?? DEFAULT_AUTO_SPEND_CAP;
  const operatorSignerId = getPrivyOperatorSignerId();

  if (!operatorSignerId) {
    throw new Error(
      "PRIVY_OPERATOR_SIGNER_ID or NEXT_PUBLIC_PRIVY_SIGNER_ID must be configured"
    );
  }

  const creatorWallet = await db.query.userWallets.findFirst({
    where: eq(userWallets.userId, input.creatorUserId),
  });
  const ownerUserId = creatorWallet?.privyUserId?.trim();

  if (!(creatorWallet && ownerUserId)) {
    throw new Error(
      "Connect your Privy wallet before provisioning the org treasury"
    );
  }

  const ownerQuorum = await createPrivyKeyQuorum({
    displayName: `${input.organizationName} owners`,
    authorizationThreshold: 1,
    userIds: [ownerUserId],
  });

  const privyOrg = await createPrivyOrganization({
    displayName: input.organizationName,
    defaultKeyQuorumId: ownerQuorum.id,
  });

  const autoPolicy = await createPrivyPolicy({
    name: `${input.organizationName} auto payroll`,
    ownerId: ownerQuorum.id,
    rules: buildAutoTransferPolicyRules(spendCap),
  });

  const humanPolicy = await createPrivyPolicy({
    name: `${input.organizationName} owner treasury`,
    ownerId: ownerQuorum.id,
    rules: buildOwnerTransferPolicyRules(),
  });

  const wallet = await createPrivyOrgWallet({
    ownerId: ownerQuorum.id,
    policyIds: [humanPolicy.id],
    privyOrganizationId: privyOrg.id,
    additionalSigners: [
      {
        signer_id: operatorSignerId,
        override_policy_ids: [autoPolicy.id],
      },
    ],
  });

  return {
    privyOrganizationId: privyOrg.id,
    ownerQuorumId: ownerQuorum.id,
    operatorSignerId,
    autoPolicyId: autoPolicy.id,
    humanPolicyId: humanPolicy.id,
    privyWalletId: wallet.id,
    address: wallet.address,
  };
}

export async function syncPayeeAllowlistPolicy(input: {
  organizationName: string;
  ownerQuorumId: string;
  autoPolicyId: string;
  spendCapUsdc: string;
  allowlistedAddresses: string[];
}): Promise<void> {
  await createPrivyPolicy({
    name: `${input.organizationName} auto payroll`,
    rules: buildAutoTransferPolicyRules(
      input.spendCapUsdc,
      input.allowlistedAddresses
    ),
  });
}

export { DEFAULT_AUTO_SPEND_CAP, TREASURY_CHAIN };
