const USDC_SCALE = 1_000_000;
const TRAILING_ZEROS = /0+$/;

export function parseUsdcToMicro(value: string | null | undefined): bigint {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return BigInt(0);
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return BigInt(0);
  }
  return BigInt(Math.round(numeric * USDC_SCALE));
}

export function formatUsdcFromMicro(micro: bigint): string {
  const whole = micro / BigInt(USDC_SCALE);
  const fraction = micro % BigInt(USDC_SCALE);
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  return `${whole}.${fraction.toString().padStart(6, "0").replace(TRAILING_ZEROS, "")}`;
}

export function wouldExceedPerTxCap(
  amountUsdc: string,
  autoSpendCapUsdc: string | null | undefined
): boolean {
  if (!autoSpendCapUsdc) {
    return false;
  }
  return parseUsdcToMicro(amountUsdc) > parseUsdcToMicro(autoSpendCapUsdc);
}

export function wouldExceedDailyCap(
  usedTodayUsdc: string,
  amountUsdc: string,
  dailySpendCapUsdc: string | null | undefined
): boolean {
  if (dailySpendCapUsdc == null || dailySpendCapUsdc === "") {
    return false;
  }
  const projected =
    parseUsdcToMicro(usedTodayUsdc) + parseUsdcToMicro(amountUsdc);
  return projected > parseUsdcToMicro(dailySpendCapUsdc);
}

export function sumUsdc(amounts: string[]): string {
  let total = BigInt(0);
  for (const amount of amounts) {
    total += parseUsdcToMicro(amount);
  }
  return formatUsdcFromMicro(total);
}
