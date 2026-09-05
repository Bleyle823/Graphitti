"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ConnectWalletButtonProps = {
  compact?: boolean;
};

export function ConnectWalletButton({ compact }: ConnectWalletButtonProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    return null;
  }
  return <ConnectWalletButtonInner compact={compact} />;
}

function ConnectWalletButtonInner({ compact }: ConnectWalletButtonProps) {
  const { login, authenticated, user, getAccessToken, ready } = usePrivy();
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!authenticated || !user) {
      return;
    }
    const link = async () => {
      try {
        setLinking(true);
        const token = await getAccessToken();
        if (!token) {
          return;
        }
        await fetch("/api/privy/link-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            walletId: user.wallet?.id,
            address: user.wallet?.address,
            privyUserId: user.id,
          }),
        });
      } catch {
        toast.error("Could not link wallet");
      } finally {
        setLinking(false);
      }
    };
    link();
  }, [authenticated, user, getAccessToken]);

  const label = authenticated
    ? linking
      ? "Linking wallet..."
      : "Wallet connected"
    : "Connect wallet";

  return (
    <Button
      className="w-full"
      disabled={!ready || linking || authenticated}
      onClick={() => login()}
      size={compact ? "sm" : "default"}
      type="button"
      variant="outline"
    >
      <Wallet className="mr-2 size-4" />
      {label}
    </Button>
  );
}
