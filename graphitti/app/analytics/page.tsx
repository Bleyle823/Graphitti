"use client";

import { BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageEmptyState, SignInGate } from "@/components/page-empty-state";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api, type ActivityItem } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isAnonymousUser } from "@/lib/is-anonymous";
import { cn } from "@/lib/utils";

type AnalyticsData = {
  workflows: number;
  listed: number;
  executions: number;
  successes: number;
  errors: number;
};

export default function AnalyticsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recent, setRecent] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAnonymous = isAnonymousUser(session?.user);

  useEffect(() => {
    if (isPending || isAnonymous) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.analytics.summary(),
      api.activity.list().catch(() => ({ items: [] as ActivityItem[] })),
    ])
      .then(([summary, activity]) => {
        setData(summary);
        setRecent(activity.items.slice(0, 8));
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [isAnonymous, isPending]);

  if (!isPending && isAnonymous) {
    return (
      <PageShell
        description="A snapshot of your workflows and recent runs."
        title="Analytics"
      >
        <SignInGate
          description="Sign in to see workflow counts, run volume, and success rate."
          icon={BarChart3}
          title="Sign in to view analytics"
        />
      </PageShell>
    );
  }

  const cards = data
    ? [
        { label: "Workflows", value: data.workflows },
        { label: "Listed", value: data.listed },
        { label: "Runs", value: data.executions },
        { label: "Succeeded", value: data.successes },
        { label: "Failed", value: data.errors },
      ]
    : [];

  const successRate =
    data && data.executions > 0
      ? Math.round((data.successes / data.executions) * 100)
      : null;

  return (
    <PageShell
      description="A snapshot of your workflows and recent runs."
      title="Analytics"
    >
      {loading || isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : !data || data.executions === 0 ? (
        <PageEmptyState
          action={
            <Button onClick={() => router.push("/")} size="sm">
              Create a workflow
            </Button>
          }
          description="Run a workflow to see counts, success rate, and recent activity here."
          icon={BarChart3}
          title="No runs yet"
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div className="rounded-xl border bg-card p-4" key={card.label}>
                <p className="text-muted-foreground text-xs">{card.label}</p>
                <p className="mt-2 font-semibold text-2xl tabular-nums">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
          {successRate !== null ? (
            <p className="text-muted-foreground text-sm">
              Success rate {successRate}% across {data.executions} runs.
            </p>
          ) : null}
          {recent.length > 0 ? (
            <div>
              <h2 className="mb-3 font-medium text-sm">Recent runs</h2>
              <ul className="divide-y rounded-xl border bg-card">
                {recent.map((item) => (
                  <li key={item.id}>
                    <button
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-muted/50"
                      onClick={() => router.push(`/workflows/${item.workflowId}`)}
                      type="button"
                    >
                      <span className="truncate font-medium">
                        {item.workflowName}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs capitalize",
                          item.status === "success" &&
                            "bg-primary/10 text-foreground",
                          item.status === "error" &&
                            "bg-destructive/10 text-destructive"
                        )}
                      >
                        {item.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}
