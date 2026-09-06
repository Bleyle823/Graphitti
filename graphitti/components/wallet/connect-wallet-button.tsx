"use client";

import { usePrivy } from "@privy-io/react-auth";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { isPrivyConfigured } from "@/lib/privy/client-config";
import { PrivyIcon } from "@/plugins/privy/icon";

type ConnectWalletButtonProps = {
  compact?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
};

export function ConnectWalletButton({
  compact,
  className,
  variant = "outline",
}: ConnectWalletButtonProps) {
  if (!isPrivyConfigured()) {
    return null;
  }

  return (
    <ConnectWalletButtonInner
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
}: ConnectWalletButtonProps) {
  const { connectOrCreateWallet, authenticated, user, getAccessToken, ready } =
    usePrivy();
  const [linking, setLinking] = useState(false);

  const ensureAppSession = useCallback(async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      await authClient.signIn.anonymous();
    }
  }, []);

  useEffect(() => {
    if (!authenticated || !user) {
      return;
    }

    const link = async () => {
      try {
        setLinking(true);
        await ensureAppSession();

        const token = await getAccessToken();
        if (!token) {
          return;
        }

        const response = await fetch("/api/privy/link-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            walletId: user.wallet?.id,
            address: user.wallet?.address,
            privyUserId: user.id,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || "Failed to link wallet");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not link wallet"
        );
      } finally {
        setLinking(false);
      }
    };

    link();
  }, [authenticated, user, getAccessToken, ensureAppSession]);

  const handleConnect = async () => {
    try {
      await ensureAppSession();
      connectOrCreateWallet();
    } catch {
      toast.error("Could not start wallet connection");
    }
  };

  const label = authenticated
    ? linking
      ? "Linking wallet..."
      : "Wallet connected"
    : "Connect Wallet";

  return (
    <Button
      className={className ?? "w-full"}
      disabled={!ready || linking || authenticated}
      onClick={() => {
        void handleConnect();
      }}
      size={compact ? "sm" : "default"}
      type="button"
      variant={variant}
    >
      <PrivyIcon className="mr-2 size-4" />
      {label}
    </Button>
  );
}
