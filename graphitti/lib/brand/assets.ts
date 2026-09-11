import type { BrandLogoAsset } from "./brand-logo";

/** PNG/SVG brand marks in public/brand — used by plugins and shared integrations. */
export const PLUGIN_BRAND_ASSETS: Record<string, BrandLogoAsset> = {
  circle: { light: "/brand/circle-mark.png" },
  privy: {
    light: "/brand/privy-symbol-black.png",
    dark: "/brand/privy-symbol-white.png",
  },
  "the-graph": {
    light: "/brand/graph-logomark-dark.png",
    dark: "/brand/graph-logomark-light.png",
  },
  "fantasy-premier-league": {
    light: "/brand/pl-logo-compact-dark.png",
    dark: "/brand/pl-logo-compact-light.png",
  },
  "ai-gateway": { light: "/brand/vercel.svg" },
  blob: { light: "/brand/vercel.svg" },
  v0: { light: "/brand/vercel.svg" },
  github: { light: "/brand/github.svg" },
  slack: { light: "/brand/slack.svg" },
  stripe: { light: "/brand/stripe.svg" },
  discord: { light: "/brand/discord.svg" },
  telegram: { light: "/brand/telegram.svg" },
  linear: { light: "/brand/linear.svg" },
  resend: { light: "/brand/resend.svg" },
  sendgrid: { light: "/brand/sendgrid.svg" },
  clerk: { light: "/brand/clerk.svg" },
  firecrawl: { light: "/brand/firecrawl.svg" },
  perplexity: { light: "/brand/perplexity.svg" },
  webflow: { light: "/brand/webflow.svg" },
  web3: { light: "/brand/ethereum.svg" },
  blockscout: { light: "/brand/blockscout.svg" },
  fal: { light: "/brand/fal.svg" },
  hyperliquid: { light: "/protocols/hyperliquid.png" },
  safe: { light: "/protocols/safe.png" },
  cowswap: { light: "/protocols/cowswap.png" },
  arc: {
    light: "/brand/Arc_Icon_Navy.png",
    dark: "/brand/Arc_Icon_White.png",
  },
  supabase: { light: "/protocols/supabase-logo-icon.png" },
};

export function getPluginBrandAsset(
  integration: string
): BrandLogoAsset | undefined {
  return PLUGIN_BRAND_ASSETS[integration];
}
