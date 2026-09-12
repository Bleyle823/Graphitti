import { ARC_USDC_ERC20, CHAINS } from "@/lib/web3/chains";

export const RESERVED_SLUGS = [
  "marketplace",
  "api",
  "mcp",
  "openapi",
  "admin",
  "hub",
] as const;

export const ARC_MARKETPLACE_CHAIN = CHAINS["arc-testnet"];
export const ARC_MARKETPLACE_ASSET = ARC_USDC_ERC20;
export const ARC_MARKETPLACE_DECIMALS = 6;

/** Circle Gateway Wallet on Arc Testnet (same address as other Gateway testnets). */
export const MARKETPLACE_GATEWAY_WALLET =
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;

export const GATEWAY_WALLET_BATCHED_NAME = "GatewayWalletBatched";
export const GATEWAY_WALLET_BATCHED_VERSION = "1";

/** 7 days plus verification latency, matching Circle Gateway middleware. */
export const MARKETPLACE_X402_MAX_TIMEOUT_SECONDS = 604_900;

export const CIRCLE_GATEWAY_X402_BASE =
  "https://gateway-api-testnet.circle.com";

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

export function toKebabSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function normalizeListingSlug(slug: string): string {
  const trimmed = slug.trim();
  try {
    return decodeURIComponent(trimmed).trim().toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/** Strip $ / USDC / extra dots so overlay values persist as a numeric price. */
export function parseListingPriceUsdc(raw: unknown): string {
  const text = String(raw ?? "0").trim();
  const cleaned = text.replace(/[^0-9.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const normalized =
    firstDot === -1
      ? cleaned
      : `${cleaned.slice(0, firstDot + 1)}${cleaned
          .slice(firstDot + 1)
          .replace(/\./g, "")}`;
  if (!normalized) {
    return "0";
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return "0";
  }
  return normalized;
}

export function priceToAtomicUsdc(priceUsdc: string): string {
  const [whole = "0", frac = ""] = priceUsdc.trim().split(".");
  const padded = `${whole}${frac.padEnd(ARC_MARKETPLACE_DECIMALS, "0")}`.slice(
    0,
    whole.length + ARC_MARKETPLACE_DECIMALS
  );
  return BigInt(padded || "0").toString();
}

export function getPlatformFeeBps(): number {
  const raw = process.env.MARKETPLACE_PLATFORM_FEE_BPS;
  if (!raw) {
    return 3000;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 3000;
}
