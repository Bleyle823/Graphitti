"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isAnonymousUser } from "@/lib/is-anonymous";

type WalletAccessState = {
  /** True when the user has a linked server wallet or a promoted session. */
  hasWalletAccess: boolean;
  /** True while session or wallet link status is still loading. */
  isPending: boolean;
  linkedAddress: string | null;
  refreshWalletAccess: () => Promise<void>;
};

export function useWalletAccess(): WalletAccessState {
  const { data: session, isPending: sessionPending } = useSession();
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [walletChecked, setWalletChecked] = useState(false);

  const refreshWalletAccess = useCallback(async (): Promise<void> => {
    if (!session?.user) {
      setLinkedAddress(null);
      setWalletChecked(true);
      return;
    }

    if (!isAnonymousUser(session.user)) {
      try {
        const wallet = await api.marketplace.wallet();
        setLinkedAddress(wallet.address);
      } catch {
        setLinkedAddress(null);
      }
      setWalletChecked(true);
      return;
    }

    try {
      const wallet = await api.marketplace.wallet();
      setLinkedAddress(wallet.address);
    } catch {
      setLinkedAddress(null);
    } finally {
      setWalletChecked(true);
    }
  }, [session?.user]);

  useEffect(() => {
    if (sessionPending) {
      return;
    }
    setWalletChecked(false);
    void refreshWalletAccess();
  }, [sessionPending, session?.user?.id, refreshWalletAccess]);

  useEffect(() => {
    const onWalletLinked = (): void => {
      setWalletChecked(false);
      void refreshWalletAccess();
    };
    window.addEventListener("graphitti:wallet-linked", onWalletLinked);
    return () =>
      window.removeEventListener("graphitti:wallet-linked", onWalletLinked);
  }, [refreshWalletAccess]);

  const hasWalletAccess =
    Boolean(linkedAddress) ||
    !(sessionPending || isAnonymousUser(session?.user));

  return {
    hasWalletAccess,
    isPending: sessionPending || !walletChecked,
    linkedAddress,
    refreshWalletAccess,
  };
}
