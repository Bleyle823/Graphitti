"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";
import { getPrivyPublicAppId } from "@/lib/privy/client-config";

export function PrivyAppProvider({ children }: { children: ReactNode }) {
  const appId = getPrivyPublicAppId();
  if (!appId) {
    return children;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet"],
        embeddedWallets: {
          ethereum: {
            // Always create an embedded wallet so workflow txs can use
            // Privy server RPC even when the user also connects MetaMask.
            createOnLogin: "all-users",
          },
        },
        appearance: {
          walletChainType: "ethereum-only",
          logo: "/logo-light.png",
          showWalletLoginFirst: true,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
