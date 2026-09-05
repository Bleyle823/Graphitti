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
