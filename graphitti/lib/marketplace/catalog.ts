import type { MarketplaceListing, SavedWorkflow } from "@/lib/api-client";
import type { WorkflowTemplate } from "@/lib/workflow-templates/normalize-export";
import { toKebabSlug } from "./constants";

export type CatalogListingMeta = {
  /** Stable marketplace slug (immutable after first publish). */
  slug: string;
  category: string;
  chain: string;
  workflowType: "read" | "write";
  priceUsdcPerCall: string;
};

/** Example workflows published on the public marketplace. */
export const MARKETPLACE_CATALOG: Record<string, CatalogListingMeta> = {
  "USDC Whale and Balance Watch": {
    slug: "usdc-whale-balance-watch",
    category: "the-graph",
    chain: "mainnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
  "Circle CCTP USDC to Arc": {
    slug: "circle-cctp-usdc-to-arc",
    category: "circle",
    chain: "arc-testnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
  "Arc USDC Inbound then Swap": {
    slug: "arc-usdc-inbound-swap",
    category: "arc",
    chain: "arc-testnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
  "Privy Gasless Payroll": {
    slug: "privy-gasless-payroll",
    category: "privy",
    chain: "arc-testnet",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy USDC remittance": {
    slug: "privy-usdc-remittance",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy cross-chain USDC remittance": {
    slug: "privy-cross-chain-usdc-remittance",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy fund treasury and pay vendor": {
    slug: "privy-fund-treasury-pay-vendor",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy stablecoin rebalance swap": {
    slug: "privy-stablecoin-rebalance-swap",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy webhook vendor payout": {
    slug: "privy-webhook-vendor-payout",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Privy batch contractor payouts": {
    slug: "privy-batch-contractor-payouts",
    category: "privy",
    chain: "base-sepolia",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "FPL League Top Three USDC Payouts": {
    slug: "fpl-league-top-three-payouts",
    category: "fantasy-premier-league",
    chain: "arc-testnet",
    workflowType: "write",
    priceUsdcPerCall: "0",
  },
  "Substreams Pull Monitor (subgraph)": {
    slug: "substreams-pull-monitor",
    category: "the-graph",
    chain: "mainnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
  "Substreams Push Alert (webhook)": {
    slug: "substreams-push-alert",
    category: "the-graph",
    chain: "mainnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
  "Kelp rsETH Backing Monitor": {
    slug: "kelp-rseth-backing-monitor",
    category: "the-graph",
    chain: "mainnet",
    workflowType: "read",
    priceUsdcPerCall: "0",
  },
};

export function catalogMetaForTemplate(
  template: WorkflowTemplate
): CatalogListingMeta | undefined {
  const meta = MARKETPLACE_CATALOG[template.name];
  if (meta) {
    return meta;
  }
  return;
}

export function defaultCatalogSlug(name: string): string {
  return toKebabSlug(name);
}

export function isCatalogTemplate(name: string): boolean {
  return name in MARKETPLACE_CATALOG;
}

/** Client-safe check for catalog example workflows in the picker. */
export function isCatalogWorkflowName(name: string): boolean {
  return isCatalogTemplate(name);
}

export const CATALOG_TEMPLATE_NAMES = Object.keys(MARKETPLACE_CATALOG);

/** Map a public marketplace row to a sidebar/picker entry (canvas opened by workflow id). */
export function marketplaceListingToExampleWorkflow(
  listing: MarketplaceListing
): SavedWorkflow {
  const timestamp = listing.listedAt ?? new Date().toISOString();
  return {
    id: listing.id,
    name: listing.name,
    description: listing.description ?? "",
    nodes: [],
    edges: [],
    visibility: "public",
    createdAt: timestamp,
    updatedAt: timestamp,
    isListed: true,
    isOwner: false,
    listedSlug: listing.listedSlug,
    category: listing.category,
    chain: listing.chain,
    workflowType: listing.workflowType,
    priceUsdcPerCall: listing.priceUsdcPerCall,
  };
}
