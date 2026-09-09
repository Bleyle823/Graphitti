"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MarketplaceListing } from "@/lib/api-client";
import { Overlay } from "./overlay";

type ListingDetailOverlayProps = {
  overlayId: string;
  listing: MarketplaceListing;
};

export function ListingDetailOverlay({
  overlayId,
  listing,
}: ListingDetailOverlayProps) {
  const router = useRouter();
  const mcpPath = listing.listedSlug
    ? `/mcp/w/${listing.listedSlug}`
    : null;

  const copyEndpoint = async (): Promise<void> => {
    if (!mcpPath) {
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${mcpPath}`);
      toast.success("Endpoint copied");
    } catch {
      toast.error("Could not copy endpoint");
    }
  };

  const price =
    Number(listing.priceUsdcPerCall ?? 0) > 0
      ? `${listing.priceUsdcPerCall} USDC`
      : "Free";

  return (
    <Overlay overlayId={overlayId} title={listing.name}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          {listing.description || "No description provided."}
        </p>
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-muted-foreground text-xs">Price</dt>
            <dd className="font-medium">{price}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Type</dt>
            <dd className="font-medium capitalize">{listing.workflowType}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Category</dt>
            <dd className="font-medium">{listing.category ?? "General"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Chain</dt>
            <dd className="font-medium">{listing.chain ?? "arc-testnet"}</dd>
          </div>
        </dl>
        {listing.listedSlug ? (
          <p className="text-muted-foreground text-xs">
            Slug: {listing.listedSlug}
          </p>
        ) : null}
        {mcpPath ? (
          <Button onClick={copyEndpoint} size="sm" variant="outline">
            Copy agent endpoint
          </Button>
        ) : null}
        <Button
          onClick={() => router.push(`/workflows/${listing.id}`)}
          size="sm"
        >
          Open in editor
        </Button>
      </div>
    </Overlay>
  );
}
