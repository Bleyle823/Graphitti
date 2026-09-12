"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { Overlay } from "./overlay";

type EarningsOverlayProps = {
  overlayId: string;
};

export function EarningsOverlay({ overlayId }: EarningsOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    invocations: number;
    grossUsdc: string;
    netUsdc: string;
    platformFeeBps: number;
    chain?: string;
  } | null>(null);

  useEffect(() => {
    api.marketplace
      .earnings()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Overlay overlayId={overlayId} title="Earnings">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            Invocations: <strong>{data?.invocations ?? 0}</strong>
          </p>
          <p>
            Gross USDC: <strong>{data?.grossUsdc ?? "0"}</strong>
          </p>
          <p>
            Platform fee:{" "}
            <strong>
              {((data?.platformFeeBps ?? 3000) / 100).toFixed(0)}%
            </strong>
          </p>
          <p>
            Net USDC: <strong>{data?.netUsdc ?? "0"}</strong>
          </p>
          <p className="text-muted-foreground">
            Paid listings settle as Circle nanopayments on Arc Testnet. Agents
            pay USDC per request with no API key.
          </p>
        </div>
      )}
    </Overlay>
  );
}
