"use client";

import { Activity } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageEmptyState } from "@/components/page-empty-state";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, type ActivityItem } from "@/lib/api-client";
import { useWalletAccess } from "@/lib/hooks/use-wallet-access";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "success", "error"] as const;
type StatusFilter = (typeof FILTERS)[number];

export default function ActivityPage() {
  const { hasWalletAccess, isPending: walletAccessPending } = useWalletAccess();
  const router = useRouter();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (walletAccessPending || !hasWalletAccess) {
      setLoading(false);
      return;
    }
    api.activity
      .list()
      .then((result) => setItems(result.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [hasWalletAccess, walletAccessPending]);

  const visible = useMemo(() => {
    if (filter === "all") {
      return items;
    }
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  return (
    <PageShell
      description="Recent workflow runs across your account."
      title="Activity"
    >
      {loading || walletAccessPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !hasWalletAccess ? (
        <PageEmptyState
          action={
            <Button onClick={() => router.push("/hub?tab=marketplace")} size="sm">
              Browse examples
            </Button>
          }
          description="Connect a wallet to run workflows and see execution history here."
          icon={Activity}
          title="Connect wallet for activity"
        />
      ) : items.length === 0 ? (
        <PageEmptyState
          action={
            <Button onClick={() => router.push("/")} size="sm">
              Open editor
            </Button>
          }
          description="Execute a workflow from the toolbar to see it here."
          icon={Activity}
          title="No runs yet"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((value) => (
              <Button
                key={value}
                onClick={() => setFilter(value)}
                size="sm"
                variant={filter === value ? "default" : "outline"}
              >
                {value === "all" ? "All" : value === "success" ? "Succeeded" : "Failed"}
              </Button>
            ))}
          </div>
          {visible.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No runs match this filter.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-muted/50"
                    onClick={() => router.push(`/workflows/${item.workflowId}`)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.workflowName}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(item.startedAt).toLocaleString()}
                        {item.duration ? ` · ${item.duration}ms` : ""}
                      </p>
                      {item.error ? (
                        <p className="mt-1 truncate text-destructive text-xs">
                          {item.error}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs capitalize",
                        item.status === "success" &&
                          "bg-primary/10 text-foreground",
                        item.status === "error" &&
                          "bg-destructive/10 text-destructive",
                        item.status !== "success" &&
                          item.status !== "error" &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </PageShell>
  );
}
