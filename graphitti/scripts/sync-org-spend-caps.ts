import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";

function loadEnvFile(): void {
  const envFile = process.env.SEED_ENV_FILE?.trim() || ".env.local";
  const envPath = join(process.cwd(), envFile);
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (process.env[key]) {
      continue;
    }
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const cap = process.env.ORG_AUTO_SPEND_CAP_USDC?.trim() || "10";

  const { db } = await import("@/lib/db");
  const { organizationWallets } = await import("@/lib/db/schema");
  const { syncPayeeAllowlist } = await import("@/lib/privy/sync-payee-allowlist");

  const rows = await db.query.organizationWallets.findMany({
    where: eq(organizationWallets.isActive, true),
    columns: { id: true, organizationId: true, autoSpendCapUsdc: true },
  });

  if (rows.length === 0) {
    console.log("No active organization treasuries found.");
    return;
  }

  for (const row of rows) {
    await db
      .update(organizationWallets)
      .set({ autoSpendCapUsdc: cap, updatedAt: new Date() })
      .where(eq(organizationWallets.id, row.id));

    const policy = await syncPayeeAllowlist(row.organizationId);
    console.log(
      `Org ${row.organizationId}: cap ${row.autoSpendCapUsdc} -> ${cap}${
        policy.error ? ` (policy warning: ${policy.error})` : ""
      }`
    );
  }
}

main()
  .catch((error) => {
    console.error("sync-org-spend-caps failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    const { closeDbConnections } = await import("@/lib/db");
    await closeDbConnections();
  });
