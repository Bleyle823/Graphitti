#!/usr/bin/env tsx

/**
 * Syncs protocol PNG logos from keeperhub-staging and downloads plugin SVGs.
 * Run: pnpm fetch-brand-logos
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BRAND_DIR = join(ROOT, "public", "brand");
const PROTOCOL_DIR = join(ROOT, "public", "protocols");
const KEEPERHUB_PROTOCOLS = join(
  process.env.USERPROFILE ?? "",
  "Desktop",
  "keeperhub-staging",
  "public",
  "protocols"
);

const SIMPLE_ICONS_BASE =
  "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons";

type DownloadTarget = {
  slug: string;
  filename: string;
};

const PLUGIN_LOGOS: DownloadTarget[] = [
  { slug: "vercel", filename: "vercel.svg" },
  { slug: "github", filename: "github.svg" },
  { slug: "slack", filename: "slack.svg" },
  { slug: "stripe", filename: "stripe.svg" },
  { slug: "discord", filename: "discord.svg" },
  { slug: "telegram", filename: "telegram.svg" },
  { slug: "linear", filename: "linear.svg" },
  { slug: "resend", filename: "resend.svg" },
  { slug: "clerk", filename: "clerk.svg" },
  { slug: "perplexity", filename: "perplexity.svg" },
  { slug: "webflow", filename: "webflow.svg" },
  { slug: "ethereum", filename: "ethereum.svg" },
  { slug: "sendgrid", filename: "sendgrid.svg" },
];

const FALLBACK_SVGS: Record<string, string> = {
  sendgrid: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>SendGrid</title><rect x="2" y="2" width="9" height="9" rx="1.5" fill="#51A9E3"/><rect x="13" y="2" width="9" height="9" rx="1.5" fill="#51A9E3"/><rect x="2" y="13" width="9" height="9" rx="1.5" fill="#51A9E3"/><rect x="13" y="13" width="9" height="9" rx="1.5" fill="#51A9E3"/></svg>`,
  firecrawl: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Firecrawl</title><path fill="#FF6B35" d="M12 2C8.5 2 5.8 4.2 4.6 7.3L8 9.1c.6-1.6 2.1-2.7 4-2.7 2.2 0 4 1.8 4 4s-1.8 4-4 4c-.9 0-1.7-.3-2.4-.8l-1.6 2.8c1.2.8 2.6 1.2 4 1.2 4.4 0 8-3.6 8-8s-3.6-8-8-8zm-7.4 8.7L2 13.4c1.2 3.1 3.9 5.3 7.4 5.3.9 0 1.7-.2 2.4-.5l-1.6-2.8c-.3.1-.5.1-.8.1-2.2 0-4-1.8-4-4 0-.5.1-1 .3-1.5z"/></svg>`,
  blockscout: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Blockscout</title><path fill="#6B39E6" d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"/></svg>`,
  fal: `<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>fal.ai</title><path fill="#000" d="M4 18V6h3.2l4.8 7.2V6H15v12h-3.2L7 10.8V18H4zm11.5 0V6H20v12h-4.5z"/></svg>`,
};

async function downloadIcon(
  slug: string,
  destDir: string,
  filename: string
): Promise<boolean> {
  const url = `${SIMPLE_ICONS_BASE}/${slug}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    const fallback = FALLBACK_SVGS[slug];
    if (fallback) {
      writeFileSync(join(destDir, filename), fallback, "utf-8");
      console.log(`   Wrote fallback ${filename}`);
      return true;
    }
    console.warn(`   Skipped ${filename} (${slug}): HTTP ${response.status}`);
    return false;
  }
  const svg = await response.text();
  writeFileSync(join(destDir, filename), svg, "utf-8");
  console.log(`   Downloaded ${filename}`);
  return true;
}

function syncKeeperhubProtocols(): void {
  if (!existsSync(KEEPERHUB_PROTOCOLS)) {
    console.warn(
      `   Keeperhub protocols not found at ${KEEPERHUB_PROTOCOLS}, skipping PNG sync`
    );
    return;
  }

  const files = readdirSync(KEEPERHUB_PROTOCOLS);
  for (const file of files) {
    if (!file.endsWith(".png")) {
      continue;
    }
    copyFileSync(
      join(KEEPERHUB_PROTOCOLS, file),
      join(PROTOCOL_DIR, file)
    );
    console.log(`   Copied protocols/${file}`);
  }
}

async function main(): Promise<void> {
  mkdirSync(BRAND_DIR, { recursive: true });
  mkdirSync(PROTOCOL_DIR, { recursive: true });

  console.log("Syncing protocol PNGs from keeperhub-staging...");
  syncKeeperhubProtocols();

  console.log("Downloading plugin logos to public/brand/...");
  for (const item of PLUGIN_LOGOS) {
    await downloadIcon(item.slug, BRAND_DIR, item.filename);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
