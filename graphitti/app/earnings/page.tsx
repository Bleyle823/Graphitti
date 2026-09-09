"use client";

import { DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageEmptyState } from "@/components/page-empty-state";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { useWalletAccess } from "@/lib/hooks/use-wallet-access";

type EarningsData = {
  invocations: number;
  grossUsdc: string;
  netUsdc: string;
  platformFeeBps: number;
  chain: string;
};

export default function EarningsPage() {
  const { hasWalletAccess, isPending: walletAccessPending } = useWalletAccess();
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAccessPending || !hasWalletAccess) {
      setLoading(false);
      return;
    }
    api.marketplace
      .earnings()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [hasWalletAccess, walletAccessPending]);

  return (
    <PageShell
      description="Revenue from listed workflows, settled in Arc USDC."
      title="Earnings"
    >
      {loading || walletAccessPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !hasWalletAccess ? (
        <PageEmptyState
          action={
            <Button
              onClick={() => router.push("/hub?tab=marketplace")}
              size="sm"
            >
              Browse marketplace
            </Button>
          }
          description="Connect a wallet to list workflows and track USDC earnings from agent calls."
          icon={DollarSign}
          title="Connect wallet for earnings"
        />
      ) : !data || data.invocations === 0 ? (
        <PageEmptyState
          action={
            <Button
              onClick={() => router.push("/hub?tab=marketplace")}
              size="sm"
            >
              Browse marketplace
            </Button>
          }
          description="List a workflow on the marketplace to start earning Arc USDC per call."
          icon={DollarSign}
          title="No earnings yet"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Invocations" value={String(data.invocations)} />
            <Stat label="Gross USDC" value={data.grossUsdc} />
            <Stat
              label="Platform fee"
              value={`${(data.platformFeeBps / 100).toFixed(0)}%`}
            />
            <Stat label="Net USDC" value={data.netUsdc} />
          </div>
          <p className="mt-6 text-muted-foreground text-sm">
            Paid listings settle on Arc Testnet as USDC (6-decimal ERC-20)
            {data.chain ? ` on ${data.chain}` : ""}.
          </p>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-2 font-semibold text-2xl tabular-nums">{value}</p>
    </div>
  );
}
