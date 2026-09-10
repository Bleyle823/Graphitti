"use client";

import { Workflow as WorkflowIcon } from "lucide-react";
import { PageEmptyState } from "@/components/page-empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { MarketplaceListing } from "@/lib/api-client";

type HubWorkflowExamplesProps = {
  loading: boolean;
  items: MarketplaceListing[];
  query: string;
  onClearSearch: () => void;
  onOpen: (listing: MarketplaceListing) => void;
};

function exampleMeta(item: MarketplaceListing): string {
  const parts = [
    item.category ?? undefined,
    item.chain ?? "arc-testnet",
    item.workflowType,
  ].filter((part): part is string => Boolean(part));
  return parts.join(" · ");
}

export function HubWorkflowExamples({
  loading,
  items,
  query,
  onClearSearch,
  onOpen,
}: HubWorkflowExamplesProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <PageEmptyState
        action={
          query ? (
            <Button onClick={onClearSearch} size="sm" variant="outline">
              Clear search
            </Button>
          ) : null
        }
        description={
          query
            ? "No example workflows match that search."
            : "Seed catalog examples with pnpm seed:workflows, then refresh."
        }
        icon={WorkflowIcon}
        title="No example workflows yet"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <button
          className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
          key={item.id}
          onClick={() => onOpen(item)}
          type="button"
        >
          <p className="font-medium text-sm">{item.name}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            {exampleMeta(item)}
          </p>
          {item.description ? (
            <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">
              {item.description}
            </p>
          ) : null}
        </button>
      ))}
    </div>
  );
}
