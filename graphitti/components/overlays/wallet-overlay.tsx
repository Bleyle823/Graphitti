"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { api } from "@/lib/api-client";
import { Overlay } from "./overlay";

type WalletOverlayProps = {
  overlayId: string;
};

export function WalletOverlay({ overlayId }: WalletOverlayProps) {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<string | null>(null);
  const [gaslessEnabled, setGaslessEnabled] = useState(false);
  const [gasMode, setGasMode] = useState<string | null>(null);
  const [gasAsset, setGasAsset] = useState<string | null>(null);

  useEffect(() => {
    api.marketplace
      .wallet()
      .then((wallet) => {
        setAddress(wallet.address);
        setGaslessEnabled(wallet.gaslessEnabled);
        setGasMode(wallet.gasMode ?? null);
        setGasAsset(wallet.gasAsset ?? null);
      })
      .catch(() => {
        setAddress(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const copyAddress = async (): Promise<void> => {
    if (!address) {
      return;
    }
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy address");
    }
  };

  return (
    <Overlay overlayId={overlayId} title="Wallet">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">Embedded wallet</p>
            <p className="mt-1 break-all text-muted-foreground">
              {address || "No wallet linked yet."}
            </p>
          </div>
          {gaslessEnabled ? (
            <p className="text-muted-foreground text-xs">
              {gasMode === "user-pays"
                ? `Gasless ETH enabled — wallet pays gas in ${(gasAsset || "usdc").toUpperCase()}.`
                : gasMode === "app-pays"
                  ? "Gasless sends enabled — app credits cover gas."
                  : "Gasless sends are enabled."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {address ? (
              <Button onClick={copyAddress} size="sm" variant="outline">
                Copy address
              </Button>
            ) : null}
            <ConnectWalletButton compact />
          </div>
        </div>
      )}
    </Overlay>
  );
}
