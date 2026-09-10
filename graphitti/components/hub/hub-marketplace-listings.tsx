"use client";

import { Store } from "lucide-react";
import { PageEmptyState } from "@/components/page-empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { MarketplaceListing } from "@/lib/api-client";

type HubMarketplaceListingsProps = {
  loading: boolean;
  items: MarketplaceListing[];
  query: string;
  onClearSearch: () => void;
  onListWorkflow: () => void;
  onOpen: (listing: MarketplaceListing) => void;
};

function listingMeta(item: MarketplaceListing): string {
  const category = item.category ? ` · ${item.category}` : "";
  return `${item.listedSlug} · ${item.workflowType} · ${item.chain ?? "arc-testnet"}${category}`;
}

function listingPrice(item: MarketplaceListing): string {
  if (Number(item.priceUsdcPerCall ?? 0) > 0) {
    return `${item.priceUsdcPerCall} USDC`;
  }
  return "Free";
}

export function HubMarketplaceListings({
  loading,
  items,
  query,
  onClearSearch,
  onListWorkflow,
  onOpen,
}: HubMarketplaceListingsProps): React.ReactElement {
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
          <div className="flex flex-wrap justify-center gap-2">
            {query ? (
              <Button onClick={onClearSearch} size="sm" variant="outline">
                Clear search
              </Button>
            ) : null}
            <Button onClick={onListWorkflow} size="sm">
              List a workflow
            </Button>
          </div>
        }
        description={
          query
            ? "No listed workflows match that search."
            : "Publish a workflow from the editor to make it callable by agents."
        }
        icon={Store}
        title="No listed workflows yet"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
            onClick={() => onOpen(item)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs">
                  {listingMeta(item)}
                </p>
              </div>
              <p className="text-sm tabular-nums">{listingPrice(item)}</p>
            </div>
            {item.description ? (
              <p className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                {item.description}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
