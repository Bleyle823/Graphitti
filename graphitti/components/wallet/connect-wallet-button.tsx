"use client";

import {
  getEmbeddedConnectedWallet,
  useConnectOrCreateWallet,
  useCreateWallet,
  usePrivy,
  useWallets,
} from "@privy-io/react-auth";
import { LogOut } from "lucide-react";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WalletBlockie } from "@/components/wallet/wallet-blockie";
import { toChecksumAddress, truncateAddress } from "@/lib/address-utils";
import { authClient } from "@/lib/auth-client";
import { isPrivyConfigured } from "@/lib/privy/client-config";
import { pickEmbeddedWalletFromLinkedAccounts } from "@/lib/privy/embedded-wallet";
import { cn } from "@/lib/utils";
import { PrivyIcon } from "@/plugins/privy/icon";

type ConnectWalletButtonProps = {
  compact?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  /** When true, hide disconnect and use outline chip next to the avatar. */
  chipOnly?: boolean;
};

export function ConnectWalletButton({
  compact,
  className,
  variant = "outline",
  chipOnly = false,
}: ConnectWalletButtonProps) {
  if (!isPrivyConfigured()) {
    return null;
  }

  return (
    <ConnectWalletButtonInner
      chipOnly={chipOnly}
      className={className}
      compact={compact}
      variant={variant}
    />
  );
}

function ConnectWalletButtonInner({
  compact,
  className,
  variant = "outline",
  chipOnly = false,
}: ConnectWalletButtonProps) {
  const { authenticated, user, getAccessToken, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const linkingRef = useRef(false);
  const linkedWalletIdRef = useRef<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);

  const ensureAppSession = useCallback(async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      await authClient.signIn.anonymous();
    }
  }, []);

  const resolveEmbedded = useCallback(() => {
    const fromLinked = pickEmbeddedWalletFromLinkedAccounts(user?.linkedAccounts);
    if (fromLinked) {
      return fromLinked;
    }

    const embedded = getEmbeddedConnectedWallet(wallets);
    if (!embedded?.address) {
      return null;
    }

    // Prefer server wallet id from linked accounts matching this address.
    const linkedMatch = user?.linkedAccounts?.find(
      (account) =>
        account.type === "wallet" &&
        account.address?.toLowerCase() === embedded.address.toLowerCase() &&
        "id" in account &&
        typeof (account as { id?: unknown }).id === "string"
    ) as { id?: string } | undefined;

    return {
      address: embedded.address,
      walletId: linkedMatch?.id || embedded.address,
    };
  }, [user?.linkedAccounts, wallets]);

  const linkEmbeddedWallet = useCallback(async () => {
    if (!authenticated || !user || linkingRef.current) {
      return;
    }

    linkingRef.current = true;
    setLinking(true);

    try {
      await ensureAppSession();

      let embedded = resolveEmbedded();
      if (!embedded) {
        try {
          await createWallet();
        } catch {
          // Already exists or creation raced; re-resolve below.
        }
        embedded = resolveEmbedded();
      }

      if (!embedded) {
        throw new Error("Create an embedded wallet in Privy, then try again.");
      }

      if (linkedWalletIdRef.current === embedded.walletId) {
        setLinkedAddress(embedded.address);
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }

      const response = await fetch("/api/privy/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          walletId: embedded.walletId,
          address: embedded.address,
          privyUserId: user.id,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error || "Failed to link wallet");
      }

      const payload = (await response.json()) as { address?: string };
      linkedWalletIdRef.current = embedded.walletId;
      setLinkedAddress(payload.address ?? embedded.address);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not link wallet"
      );
    } finally {
      linkingRef.current = false;
      setLinking(false);
    }
  }, [
    authenticated,
    user,
    ensureAppSession,
    resolveEmbedded,
    createWallet,
    getAccessToken,
  ]);

  const { connectOrCreateWallet } = useConnectOrCreateWallet({
    onSuccess: () => {
      void linkEmbeddedWallet();
    },
    onError: (error) => {
      toast.error(String(error) || "Could not connect wallet");
    },
  });

  useEffect(() => {
    if (!(authenticated && user)) {
      linkedWalletIdRef.current = null;
      setLinkedAddress(null);
      return;
    }

    void linkEmbeddedWallet();
    // Intentionally key off auth + wallet count, not callback identity.
    // biome-ignore lint/correctness/useExhaustiveDependencies: linkEmbeddedWallet is stable enough via refs; avoid re-link loops
  }, [authenticated, user?.id, wallets.length]);

  const handleConnect = async () => {
    try {
      await ensureAppSession();
      connectOrCreateWallet();
    } catch {
      toast.error("Could not start wallet connection");
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      const checksummed = toChecksumAddress(address);
      await navigator.clipboard.writeText(checksummed);
      toast.success("Address copied");
    } catch {
      toast.error("Could not copy address");
    }
  };

  const handleDisconnect = async () => {
    try {
      await logout();
      linkedWalletIdRef.current = null;
      setLinkedAddress(null);
    } catch {
      toast.error("Could not disconnect wallet");
    }
  };

  const displayAddress =
    linkedAddress ?? resolveEmbedded()?.address ?? null;

  if (authenticated && displayAddress) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Button
          className={cn(
            "gap-2 font-mono",
            compact ? "h-9 px-2.5" : "h-10 px-3"
          )}
          onClick={() => {
            void handleCopyAddress(displayAddress);
          }}
          size={compact ? "sm" : "default"}
          title={toChecksumAddress(displayAddress)}
          type="button"
          variant={chipOnly ? "outline" : variant}
        >
          <WalletBlockie address={displayAddress} size={compact ? 18 : 20} />
          <span className="text-xs sm:text-sm">
            {truncateAddress(displayAddress)}
          </span>
        </Button>
        {!chipOnly ? (
          <Button
            aria-label="Disconnect wallet"
            className={compact ? "size-9" : "size-10"}
            onClick={() => {
              void handleDisconnect();
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <LogOut className="size-4" />
          </Button>
        ) : null}
      </div>
    );
  }

  if (chipOnly && authenticated && linking) {
    return (
      <Button
        className={cn("h-9 gap-2", className)}
        disabled
        size="sm"
        type="button"
        variant="outline"
      >
        Linking wallet...
      </Button>
    );
  }

  return (
    <Button
      className={className ?? "w-full"}
      disabled={!ready || linking}
      onClick={() => {
        void handleConnect();
      }}
      size={compact ? "sm" : "default"}
      type="button"
      variant={chipOnly ? "outline" : variant}
    >
      <PrivyIcon className="mr-2 size-4" />
      {linking ? "Linking wallet..." : "Connect Wallet"}
    </Button>
  );
}
