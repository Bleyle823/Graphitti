export const DEFAULT_AUTO_SPEND_CAP = "10";
export const TREASURY_CHAIN = "base_sepolia";

export function buildAutoTransferPolicyRules(
  spendCapUsdc: string,
  allowlistedAddresses: string[] = []
): Record<string, unknown>[] {
  const recipientCondition =
    allowlistedAddresses.length > 0
      ? {
          field_source: "action_request_body",
          field: "destination.address",
          operator: "in",
          value: allowlistedAddresses,
        }
      : null;

  return [
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
          field: "source.amount",
          operator: "lte",
          value: spendCapUsdc,
        },
        ...(recipientCondition ? [recipientCondition] : []),
      ],
    },
  ];
}
