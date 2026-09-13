import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import {
  buildAutoTransferPolicyRules,
  DEFAULT_AUTO_SPEND_CAP,
} from "@/lib/privy/policy-rules";

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

async function patchPrivyPolicy(
  policyId: string,
  rules: Record<string, unknown>[]
): Promise<void> {
  const appId =
    process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!(appId && appSecret)) {
    throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET are required");
  }
  const auth = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const response = await fetch(`https://api.privy.io/v1/policies/${policyId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "privy-app-id": appId,
    },
    body: JSON.stringify({ name: "auto payroll", rules }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Privy policy PATCH failed: HTTP ${response.status} ${text}`);
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  const cap = process.env.ORG_AUTO_SPEND_CAP_USDC?.trim() || DEFAULT_AUTO_SPEND_CAP;

  const { db } = await import("@/lib/db");
  const { organizationPayees, organizationWallets } = await import(
    "@/lib/db/schema"
  );

  const rows = await db.query.organizationWallets.findMany({
    where: eq(organizationWallets.isActive, true),
    columns: {
      id: true,
      organizationId: true,
      autoSpendCapUsdc: true,
      autoPolicyId: true,
    },
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

    let policyNote = "";
    if (row.autoPolicyId) {
      const payees = await db.query.organizationPayees.findMany({
        where: eq(organizationPayees.organizationId, row.organizationId),
        columns: { address: true },
      });
      const rules = buildAutoTransferPolicyRules(
        cap,
        payees.map((p) => p.address)
      );
      try {
        await patchPrivyPolicy(row.autoPolicyId, rules);
        policyNote = " (Privy policy synced)";
      } catch (error) {
        policyNote = ` (Privy policy warning: ${
          error instanceof Error ? error.message : String(error)
        })`;
      }
    }

    console.log(
      `Org ${row.organizationId}: cap ${row.autoSpendCapUsdc} -> ${cap}${policyNote}`
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
