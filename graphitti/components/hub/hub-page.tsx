"use client";

import { Globe, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, type MarketplaceListing } from "@/lib/api-client";
import { getAllIntegrations } from "@/plugins";

const TABS = ["integrations", "marketplace"] as const;
type HubTab = (typeof TABS)[number];

function isHubTab(value: string | null): value is HubTab {
  return value === "integrations" || value === "marketplace";
}

export function HubPage(): React.ReactElement {
  const router = useRouter();
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
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    } else {
      params.delete("q");
    }
    if (tab === "marketplace") {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }
    const next = params.toString();
    const current = searchParams.toString();
    if (next !== current) {
      router.replace(`/hub?${next}`, { scroll: false });
    }
  }, [debouncedQuery, router, searchParams, sort, tab]);

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

  useEffect(() => {
    if (tab !== "marketplace") {
      return;
    }
    setLoading(true);
    api.marketplace
      .search({ q: debouncedQuery, sort })
      .then((result) => setItems(result.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sort, tab]);

  const setTab = (next: string): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/hub?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) transition-[margin-left] duration-200 ease-out md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-semibold text-2xl tracking-tight">Hub</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Browse integrations and listed workflows agents can call.
          </p>
        </div>

        <Tabs onValueChange={setTab} value={tab}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            </TabsList>
            <div className="flex flex-1 items-center justify-end gap-2 sm:max-w-md">
              <Input
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === "marketplace"
                    ? "Search marketplace"
                    : "Search integrations"
                }
                value={query}
              />
              {tab === "marketplace" ? (
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

          <TabsContent value="marketplace">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <PageEmptyState
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {debouncedQuery ? (
                      <Button
                        onClick={() => setQuery("")}
                        size="sm"
                        variant="outline"
                      >
                        Clear search
                      </Button>
                    ) : null}
                    <Button onClick={() => router.push("/")} size="sm">
                      List a workflow
                    </Button>
                  </div>
                }
                description={
                  debouncedQuery
                    ? "No listed workflows match that search."
                    : "Publish a workflow from the editor to make it callable by agents."
                }
                icon={Store}
                title="No listed workflows yet"
              />
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      className="w-full rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                      onClick={() =>
                        open(ListingDetailOverlay, { listing: item })
                      }
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.listedSlug} · {item.workflowType} ·{" "}
                            {item.chain ?? "arc-testnet"}
                            {item.category ? ` · ${item.category}` : ""}
                          </p>
                        </div>
                        <p className="text-sm tabular-nums">
                          {Number(item.priceUsdcPerCall ?? 0) > 0
                            ? `${item.priceUsdcPerCall} USDC`
                            : "Free"}
                        </p>
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
