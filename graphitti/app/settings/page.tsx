"use client";

import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SignInGate } from "@/components/page-empty-state";
import { ApiKeysOverlay } from "@/components/overlays/api-keys-overlay";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { PageShell } from "@/components/page-shell";
import { AccountSettings } from "@/components/settings/account-settings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isAnonymousUser } from "@/lib/is-anonymous";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const { open } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [gaslessEnabled, setGaslessEnabled] = useState(false);
  const [gasMode, setGasMode] = useState<string | null>(null);
  const [gasAsset, setGasAsset] = useState<string | null>(null);
  const isAnonymous = isAnonymousUser(session?.user);

  const loadAll = useCallback(async () => {
    if (isAnonymous) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const user = await api.user.get();
      setAccountName(user.name || "");
      setAccountEmail(user.email || "");
      const wallet = await api.marketplace.wallet().catch(() => null);
      setWalletAddress(wallet?.address ?? null);
      setGaslessEnabled(Boolean(wallet?.gaslessEnabled));
      setGasMode(wallet?.gasMode ?? null);
      setGasAsset(wallet?.gasAsset ?? null);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  }, [isAnonymous]);

  useEffect(() => {
    if (!isPending) {
      loadAll();
    }
    const onLinked = () => {
      void loadAll();
    };
    window.addEventListener("graphitti:wallet-linked", onLinked);
    return () => window.removeEventListener("graphitti:wallet-linked", onLinked);
  }, [isPending, loadAll]);

  const saveAccount = async (): Promise<void> => {
    try {
      setSaving(true);
      await api.user.update({ name: accountName, email: accountEmail });
      toast.success("Settings saved");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!isPending && isAnonymous) {
    return (
      <PageShell
        description="Account, wallet, connections, and API keys."
        title="Settings"
      >
        <SignInGate
          description="Connect a wallet to manage your account, connections, and API keys."
          icon={Settings}
          title="Connect wallet to manage settings"
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      description="Account, wallet, connections, and API keys."
      title="Settings"
    >
      {loading || isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="max-w-xl space-y-8">
          <section className="space-y-4">
            <h2 className="font-medium text-sm">Account</h2>
            <AccountSettings
              accountEmail={accountEmail}
              accountName={accountName}
              onEmailChange={setAccountEmail}
              onNameChange={setAccountName}
            />
            <Button disabled={saving} onClick={saveAccount}>
              {saving ? "Saving..." : "Save account"}
            </Button>
          </section>

          <section className="space-y-3">
            <h2 className="font-medium text-sm">Wallet</h2>
            <p className="break-all text-muted-foreground text-sm">
              {walletAddress || "No wallet linked. Use Connect wallet."}
            </p>
            {gaslessEnabled ? (
              <p className="text-muted-foreground text-xs">
                {gasMode === "user-pays"
                  ? `Gasless ETH — wallet pays gas in ${(gasAsset || "usdc").toUpperCase()}`
                  : gasMode === "app-pays"
                    ? "Gasless — app credits cover gas"
                    : "Gasless enabled"}
              </p>
            ) : null}
            <ConnectWalletButton compact />
          </section>

          <section className="space-y-3">
            <h2 className="font-medium text-sm">Connections</h2>
            <p className="text-muted-foreground text-sm">
              Credentials used by workflow steps.
            </p>
            <Button
              onClick={() => open(IntegrationsOverlay)}
              variant="outline"
            >
              Manage connections
            </Button>
          </section>

          <section className="space-y-3">
            <h2 className="font-medium text-sm">API keys</h2>
            <p className="text-muted-foreground text-sm">
              Keys for calling your listed workflows and the HTTP API.
            </p>
            <Button onClick={() => open(ApiKeysOverlay)} variant="outline">
              Manage API keys
            </Button>
          </section>
        </div>
      )}
    </PageShell>
  );
}
