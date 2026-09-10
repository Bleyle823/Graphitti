"use client";

import { Globe } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HubMarketplaceListings } from "@/components/hub/hub-marketplace-listings";
import { HubWorkflowExamples } from "@/components/hub/hub-workflow-examples";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { ListingDetailOverlay } from "@/components/overlays/listing-detail-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { PageEmptyState } from "@/components/page-empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrationIcon } from "@/components/ui/integration-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type MarketplaceListing } from "@/lib/api-client";
import { isCatalogWorkflowName } from "@/lib/marketplace/catalog";
import { getAllIntegrations } from "@/plugins";

const TABS = ["integrations", "workflows", "marketplace"] as const;
type HubTab = (typeof TABS)[number];

function isHubTab(value: string | null): value is HubTab {
  return (
    value === "integrations" || value === "workflows" || value === "marketplace"
  );
}

function usesListingSort(tab: HubTab): boolean {
  return tab === "marketplace" || tab === "workflows";
}

function searchPlaceholder(tab: HubTab): string {
  if (tab === "marketplace") {
    return "Search marketplace";
  }
  if (tab === "workflows") {
    return "Search example workflows";
  }
  return "Search integrations";
}

export function HubPage(): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { open } = useOverlay();
  const tabParam = searchParams.get("tab");
  const tab: HubTab = isHubTab(tabParam) ? tabParam : "integrations";
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [sort, setSort] = useState(searchParams.get("sort") ?? "recent");
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (pathname !== "/hub") {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    } else {
      params.delete("q");
    }
    if (usesListingSort(tab)) {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`/hub?${next}`, { scroll: false });
    }
  }, [debouncedQuery, pathname, router, searchParams, sort, tab]);

  const integrations = useMemo(() => getAllIntegrations(), []);
  const filteredIntegrations = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle || tab !== "integrations") {
      return integrations;
    }
    return integrations.filter(
      (plugin) =>
        plugin.label.toLowerCase().includes(needle) ||
        plugin.description.toLowerCase().includes(needle)
    );
  }, [integrations, debouncedQuery, tab]);

  const exampleItems = useMemo(
    () => items.filter((item) => isCatalogWorkflowName(item.name)),
    [items]
  );

  useEffect(() => {
    if (!usesListingSort(tab)) {
      return;
    }
    setLoading(true);
    api.marketplace
      .search({ q: debouncedQuery, sort, limit: "100" })
      .then((result) => setItems(result.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sort, tab]);

  const setTab = (next: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (!(isHubTab(next) && usesListingSort(next))) {
      params.delete("sort");
    }
    router.replace(`/hub?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) transition-[margin-left] duration-200 ease-out md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-semibold text-2xl tracking-tight">Hub</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Browse integrations, example workflows, and listed endpoints agents
            can call.
          </p>
        </div>

        <Tabs onValueChange={setTab} value={tab}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            </TabsList>
            <div className="flex flex-1 items-center justify-end gap-2 sm:max-w-md">
              <Input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder(tab)}
                value={query}
              />
              {usesListingSort(tab) ? (
                <Select onValueChange={setSort} value={sort}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="popular">Popular</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          <TabsContent value="integrations">
            {filteredIntegrations.length === 0 ? (
              <PageEmptyState
                action={
                  query ? (
                    <Button
                      onClick={() => setQuery("")}
                      size="sm"
                      variant="outline"
                    >
                      Clear search
                    </Button>
                  ) : null
                }
                description="Try a different search, or add a connection from Settings."
                icon={Globe}
                title="No integrations match"
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIntegrations.map((plugin) => (
                  <button
                    className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                    key={plugin.type}
                    onClick={() => open(IntegrationsOverlay)}
                    type="button"
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-muted">
                      <IntegrationIcon
                        className="size-5"
                        integration={plugin.type}
                      />
                    </div>
                    <p className="font-medium text-sm">{plugin.label}</p>
                    <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                      {plugin.description}
                    </p>
                    <p className="mt-2 text-muted-foreground text-xs">
                      {plugin.actions.length} actions
                    </p>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="workflows">
            <HubWorkflowExamples
              items={exampleItems}
              loading={loading}
              onClearSearch={() => setQuery("")}
              onOpen={(item) => router.push(`/workflows/${item.id}`)}
              query={debouncedQuery}
            />
          </TabsContent>

          <TabsContent value="marketplace">
            <HubMarketplaceListings
              items={items}
              loading={loading}
              onClearSearch={() => setQuery("")}
              onListWorkflow={() => router.push("/")}
              onOpen={(item) => open(ListingDetailOverlay, { listing: item })}
              query={debouncedQuery}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
