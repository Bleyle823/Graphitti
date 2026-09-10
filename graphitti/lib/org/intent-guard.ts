export type FrozenIntent = {
  toAddress: string | null;
  amountUsdc: string | null;
};

export function normalizeIntentAddress(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

export function normalizeIntentAmount(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

export function resolveApproveIntentFields(stored: FrozenIntent): FrozenIntent {
  return {
    toAddress: normalizeIntentAddress(stored.toAddress),
    amountUsdc: normalizeIntentAmount(stored.amountUsdc),
  };
}
