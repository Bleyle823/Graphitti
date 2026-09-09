"use client";

import { useSetAtom } from "jotai";
import { Key, LogOut, Moon, Plug, Rocket, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import {
  AuthDialog,
  isSingleProviderSignInInitiated,
} from "@/components/auth/dialog";
import { ApiKeysOverlay } from "@/components/overlays/api-keys-overlay";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { isAnonymousUser } from "@/lib/is-anonymous";
import { isPrivyConfigured } from "@/lib/privy/client-config";
import { gettingStartedOpenAtom } from "@/lib/ui-store";
import { useHasMounted } from "@/hooks/use-has-mounted";

export const UserMenu = () => {
  const hasMounted = useHasMounted();
  const { data: session, isPending } = useSession();
  const { theme, setTheme } = useTheme();
  const { open: openOverlay } = useOverlay();
  const router = useRouter();
  const setGettingStartedOpen = useSetAtom(gettingStartedOpenAtom);

  const handleLogout = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (session?.user?.name) {
      return session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (session?.user?.email) {
      return session.user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const signInInProgress = isSingleProviderSignInInitiated();

  useEffect(() => {
    const refresh = () => {
      router.refresh();
    };
    window.addEventListener("graphitti:wallet-linked", refresh);
    return () => window.removeEventListener("graphitti:wallet-linked", refresh);
  }, [router]);

  // Defer session-dependent Radix UI until after hydration so server/client
  // trees match and Radix useId counters stay in sync.
  if (!hasMounted || (isPending && !signInInProgress)) {
    return (
      <div aria-hidden="true" className="h-9 w-9" /> // Placeholder to maintain layout
    );
  }

  // Wallet-linked users are promoted off anonymous in link-wallet.
  const isAnonymous = isAnonymousUser(session?.user);

  // Show Connect Wallet if user is anonymous or not logged in
  if (isAnonymous) {
    if (isPrivyConfigured()) {
      return (
        <div className="flex items-center gap-2">
          <ConnectWalletButton
            className="h-9 w-auto"
            compact
            variant="default"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <AuthDialog>
          <Button
            className="h-9 disabled:opacity-100 disabled:*:text-muted-foreground"
            size="sm"
            variant="default"
          >
            Connect Wallet
          </Button>
        </AuthDialog>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isPrivyConfigured() ? (
        <ConnectWalletButton chipOnly className="h-9 w-auto" compact />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="relative h-9 w-9 rounded-full border p-0"
            variant="ghost"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                alt={session?.user?.name || ""}
                src={session?.user?.image || ""}
              />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="font-medium text-sm leading-none">
                {session?.user?.name || "User"}
              </p>
              <p className="text-muted-foreground text-xs leading-none">
                {session?.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings className="size-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openOverlay(IntegrationsOverlay)}>
            <Plug className="size-4" />
            <span>Connections</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openOverlay(ApiKeysOverlay)}>
            <Key className="size-4" />
            <span>API Keys</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setGettingStartedOpen(true);
            }}
          >
            <Rocket className="size-4" />
            <span>Getting started</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup onValueChange={setTheme} value={theme}>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
