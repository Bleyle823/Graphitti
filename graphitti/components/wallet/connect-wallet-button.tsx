"use client";

import {
  getEmbeddedConnectedWallet,
  useCreateWallet,
  useLogin,
  usePrivy,
  useSigners,
  useWallets,
} from "@privy-io/react-auth";
import { ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WalletBlockie } from "@/components/wallet/wallet-blockie";
import { toChecksumAddress, truncateAddress } from "@/lib/address-utils";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { getPrivySignerId, isPrivyConfigured } from "@/lib/privy/client-config";
import {
  type EmbeddedWalletRef,
  pickEmbeddedWalletFromLinkedAccounts,
  pickEmbeddedWalletFromWallets,
} from "@/lib/privy/embedded-wallet";
import { refetchSidebar } from "@/lib/refetch-sidebar";
import { cn } from "@/lib/utils";
import { PrivyIcon } from "@/plugins/privy/icon";

const EMBEDDED_POLL_ATTEMPTS = 20;
const EMBEDDED_POLL_MS = 400;
const DEFAULT_EXPLORER = "https://etherscan.io";

type ConnectWalletButtonProps = {
  compact?: boolean;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  /** When true, hide disconnect and use outline chip next to the avatar. */
  chipOnly?: boolean;
};

function greyChipClass(compact?: boolean): string {
  return cn(
    "justify-between gap-2 border-border/60 bg-muted font-mono text-muted-foreground hover:bg-muted/80 hover:text-foreground",
    compact ? "h-9 px-2.5" : "h-10 px-3"
  );
}

function toEmbeddedRef(
  wallet: { address?: string | null; id?: string | null } | null | undefined
): EmbeddedWalletRef | null {
  if (!wallet?.address) {
    return null;
  }
  return {
    address: wallet.address,
    walletId: wallet.id || wallet.address,
  };
}

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
  chipOnly = false,
}: ConnectWalletButtonProps) {
  const router = useRouter();
  const { authenticated, user, getAccessToken, ready, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { addSigners } = useSigners();
  const linkingRef = useRef(false);
  const linkedWalletIdRef = useRef<string | null>(null);
  const signerAddedForRef = useRef<string | null>(null);
  const walletsRef = useRef(wallets);
  const userRef = useRef(user);
  const linkedAddressRef = useRef<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [gasMode, setGasMode] = useState<string | null>(null);
  const [gasAsset, setGasAsset] = useState<string | null>(null);

  walletsRef.current = wallets;
  userRef.current = user;
  linkedAddressRef.current = linkedAddress;

  const ensureAppSession = useCallback(async () => {
    const session = await authClient.getSession();
    if (session.data?.user) {
      return;
    }
    const result = await authClient.signIn.anonymous();
    if (result.error && result.error.status !== 400) {
      throw new Error(result.error.message || "Could not start app session");
    }
  }, []);

  const resolveEmbedded = useCallback((): EmbeddedWalletRef | null => {
    const currentUser = userRef.current;
    const currentWallets = walletsRef.current;

    const fromLinked = pickEmbeddedWalletFromLinkedAccounts(
      currentUser?.linkedAccounts
    );
    if (fromLinked) {
      return fromLinked;
    }

    const fromWallets = pickEmbeddedWalletFromWallets(currentWallets);
    if (fromWallets) {
      return fromWallets;
    }

    return toEmbeddedRef(getEmbeddedConnectedWallet(currentWallets));
  }, []);

  const waitForEmbedded = useCallback(async () => {
    const existing = resolveEmbedded();
    if (existing) {
      return existing;
    }

    let createError: unknown = null;
    try {
      const created = await createWallet();
      const createdRef = toEmbeddedRef(created);
      if (createdRef) {
        return createdRef;
      }
    } catch (error) {
      // Either the wallet already exists (harmless) or embedded wallets are not
      // enabled for this Privy app (fatal) — keep it for the error message.
      createError = error;
    }

    for (let attempt = 0; attempt < EMBEDDED_POLL_ATTEMPTS; attempt++) {
      const found = resolveEmbedded();
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, EMBEDDED_POLL_MS));
    }

    const last = resolveEmbedded();
    if (!last && createError) {
      throw createError instanceof Error
        ? createError
        : new Error(String(createError));
    }
    return last;
  }, [createWallet, resolveEmbedded]);

  const ensureSessionSigner = useCallback(
    async (address: string) => {
      const signerId = getPrivySignerId();
      if (!signerId) {
        return;
      }
      if (signerAddedForRef.current === address.toLowerCase()) {
        return;
      }
      try {
        await addSigners({
          address,
          signers: [{ signerId, policyIds: [] }],
        });
        signerAddedForRef.current = address.toLowerCase();
      } catch (error) {
        console.warn("[Privy] Failed to add session signer:", error);
      }
    },
    [addSigners]
  );

  const refreshWalletMeta = useCallback(async () => {
    try {
      const wallet = await api.marketplace.wallet();
      setGasMode(wallet.gasMode ?? null);
      setGasAsset(wallet.gasAsset ?? null);
      if (wallet.address) {
        setLinkedAddress(wallet.address);
      }
    } catch {
      // Optional metadata — ignore.
    }
  }, []);

  const syncWalletLink = useCallback(async (): Promise<void> => {
    await refreshWalletMeta();
    await authClient.getSession({
      fetchOptions: { cache: "no-store" },
    });
    router.refresh();
    refetchSidebar();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("graphitti:wallet-linked"));
    }
  }, [refreshWalletMeta, router]);

  const linkEmbeddedWallet = useCallback(async () => {
    if (!authenticated || linkingRef.current) {
      return;
    }

    linkingRef.current = true;
    setLinking(true);
    setSetupFailed(false);

    try {
      await ensureAppSession();

      const embedded = await waitForEmbedded();
      if (!embedded) {
        throw new Error(
          "Privy did not create an embedded wallet. Try Connect Wallet again."
        );
      }

      // Show the chip immediately — do not wait on server linking.
      setLinkedAddress(embedded.address);
      await ensureSessionSigner(embedded.address);

      const existingWallet = await api.marketplace.wallet().catch(() => null);
      if (
        existingWallet?.address &&
        linkedWalletIdRef.current === embedded.walletId
      ) {
        linkedWalletIdRef.current = embedded.walletId;
        setLinkedAddress(existingWallet.address);
        await syncWalletLink();
        return;
      }

      const token = await getAccessToken();
      if (!token) {
        throw new Error("Missing Privy access token");
      }

      const currentUser = userRef.current;
      const response = await fetch("/api/privy/link-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          walletId: embedded.walletId,
          address: embedded.address,
          privyUserId: currentUser?.id,
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
      await syncWalletLink();
    } catch (error) {
      // Keep any embedded address we already found so the UI does not snap back.
      if (linkedAddressRef.current || resolveEmbedded()) {
        console.warn(
          "[Privy] Wallet shown locally; server link failed:",
          error
        );
        toast.error(
          error instanceof Error
            ? error.message
            : "Wallet connected in Privy but server link failed. Retry wallet setup."
        );
      } else {
        setSetupFailed(true);
        toast.error(
          error instanceof Error ? error.message : "Could not link wallet"
        );
      }
    } finally {
      linkingRef.current = false;
      setLinking(false);
    }
  }, [
    authenticated,
    ensureAppSession,
    waitForEmbedded,
    ensureSessionSigner,
    getAccessToken,
    resolveEmbedded,
    syncWalletLink,
  ]);

  // `login` (not `connectOrCreateWallet`) is required here: connect-only flows
  // attach an external wallet without authenticating it, so Privy never issues a
  // user/access token and never provisions the embedded execution wallet.
  const { login } = useLogin({
    onComplete: () => {
      void linkEmbeddedWallet();
    },
    onError: (error) => {
      if (error === "exited_auth_flow") {
        return;
      }
      toast.error(String(error) || "Could not connect wallet");
    },
  });

  useEffect(() => {
    if (!(authenticated && user)) {
      linkedWalletIdRef.current = null;
      signerAddedForRef.current = null;
      setLinkedAddress(null);
      return;
    }

    const alreadyVisible = resolveEmbedded();
    if (alreadyVisible) {
      setLinkedAddress(alreadyVisible.address);
    }

    void linkEmbeddedWallet();
    // biome-ignore lint/correctness/useExhaustiveDependencies: wallets.length retriggers after embedded wallet appears
  }, [authenticated, user?.id, wallets.length, walletsReady]);

  const handleConnect = async () => {
    try {
      await ensureAppSession();
    } catch {
      // App session is only needed for server linking; still let Privy connect.
    }
    login();
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
      signerAddedForRef.current = null;
      setLinkedAddress(null);
    } catch {
      toast.error("Could not disconnect wallet");
    }
  };

  const liveEmbedded = resolveEmbedded();
  const displayAddress = linkedAddress ?? liveEmbedded?.address ?? null;
  const isBusy =
    linking || (authenticated && !displayAddress && ready && !setupFailed);

  if (authenticated && displayAddress) {
    const checksummed = toChecksumAddress(displayAddress);
    const explorerUrl = `${DEFAULT_EXPLORER}/address/${checksummed}`;
    const gasLabel =
      gasMode === "user-pays"
        ? `Gasless ETH — pays ${(gasAsset || "usdc").toUpperCase()}`
        : gasMode === "app-pays"
          ? "Gasless — app credits"
          : "Gasless execution enabled";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={cn(greyChipClass(compact), className)}
            size={compact ? "sm" : "default"}
            type="button"
            variant="outline"
          >
            <span className="min-w-0 truncate text-xs sm:text-sm">
              {truncateAddress(displayAddress)}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <WalletBlockie
                address={displayAddress}
                size={compact ? 16 : 18}
              />
              <ChevronDown className="size-3.5 opacity-60" />
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground text-sm">
                Embedded wallet
              </span>
              <span className="break-all font-mono text-muted-foreground text-xs">
                {checksummed}
              </span>
              <span className="text-muted-foreground text-xs">{gasLabel}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              void handleCopyAddress(displayAddress);
            }}
          >
            <Copy className="mr-2 size-4" />
            Copy address
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={explorerUrl} rel="noopener noreferrer" target="_blank">
              <ExternalLink className="mr-2 size-4" />
              View on explorer
            </a>
          </DropdownMenuItem>
          {chipOnly ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void handleDisconnect();
                }}
              >
                <LogOut className="mr-2 size-4" />
                Disconnect
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isBusy) {
    return (
      <Button
        className={cn(greyChipClass(compact), className)}
        disabled
        size={compact ? "sm" : "default"}
        type="button"
        variant="outline"
      >
        <span className="text-xs sm:text-sm">Setting up wallet...</span>
        <PrivyIcon className="size-3.5" />
      </Button>
    );
  }

  return (
    <Button
      className={cn(greyChipClass(compact), className ?? "w-full")}
      disabled={!ready}
      onClick={() => {
        if (authenticated && setupFailed) {
          void linkEmbeddedWallet();
          return;
        }
        void handleConnect();
      }}
      size={compact ? "sm" : "default"}
      type="button"
      variant="outline"
    >
      <span className="text-xs sm:text-sm">
        {authenticated && setupFailed ? "Retry wallet setup" : "Connect Wallet"}
      </span>
      <PrivyIcon className="size-4" />
    </Button>
  );
}
