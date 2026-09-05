"use client";

import { useEffect, useState } from "react";
import { api, type MarketplaceListing } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [loading, setLoading] = useState(true);

  const load = async (query = q, nextSort = sort) => {
    setLoading(true);
    try {
      const result = await api.marketplace.search({
        q: query,
        sort: nextSort,
      });
      setItems(result.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load("", "recent");
  }, []);

  return (
    <div className="pointer-events-auto mx-auto min-h-screen max-w-3xl bg-background/95 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-xl">Marketplace</h1>
          <p className="text-muted-foreground text-sm">
            Listed workflows. Paid calls settle in Arc USDC.
          </p>
        </div>
        <Button onClick={() => (window.location.href = "/")} variant="outline">
          Back to editor
        </Button>
      </div>
      <div className="mb-4 flex gap-2">
        <Input
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search"
          value={q}
        />
        <Select
          onValueChange={(value) => {
            setSort(value);
            load(q, value);
          }}
          value={sort}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Popular</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => load()}>Search</Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading listings...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No listed workflows yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              className="rounded-md border bg-card p-4"
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.listedSlug} · {item.workflowType} · {item.chain ?? "arc-testnet"}
                  </p>
                </div>
                <p className="text-sm tabular-nums">
                  {Number(item.priceUsdcPerCall ?? 0) > 0
                    ? `${item.priceUsdcPerCall} USDC`
                    : "Free"}
                </p>
              </div>
              {item.description ? (
                <p className="mt-2 text-muted-foreground text-sm">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
