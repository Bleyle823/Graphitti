"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiKeysOverlay } from "@/components/overlays/api-keys-overlay";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { PageShell } from "@/components/page-shell";
import { AccountSettings } from "@/components/settings/account-settings";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { useWalletAccess } from "@/lib/hooks/use-wallet-access";

function start(task: Promise<unknown>): void {
  task.catch(() => {
    /* errors are toasted by the async handler */
  });
}

function gaslessLabel(gasMode: string | null, gasAsset: string | null): string {
  if (gasMode === "user-pays") {
    return `Gasless ETH — wallet pays gas in ${(gasAsset || "usdc").toUpperCase()}`;
  }
  if (gasMode === "app-pays") {
    return "Gasless — app credits cover gas";
  }
  return "Gasless enabled";
}

type SettingsBodyProps = {
  hasWalletAccess: boolean;
  saving: boolean;
  accountName: string;
  accountEmail: string;
  walletAddress: string | null;
  gaslessEnabled: boolean;
  gasMode: string | null;
  gasAsset: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSaveAccount: () => void;
  onOpenIntegrations: () => void;
  onOpenApiKeys: () => void;
};

function SettingsBody({
  hasWalletAccess,
  saving,
  accountName,
  accountEmail,
  walletAddress,
  gaslessEnabled,
  gasMode,
  gasAsset,
  onNameChange,
  onEmailChange,
  onSaveAccount,
  onOpenIntegrations,
  onOpenApiKeys,
}: SettingsBodyProps): React.ReactElement {
  return (
    <div className="max-w-xl space-y-8">
      <section className="space-y-4">
        <h2 className="font-medium text-sm">Account</h2>
        {hasWalletAccess ? (
          <>
            <AccountSettings
              accountEmail={accountEmail}
              accountName={accountName}
              onEmailChange={onEmailChange}
              onNameChange={onNameChange}
            />
            <Button disabled={saving} onClick={onSaveAccount}>
              {saving ? "Saving..." : "Save account"}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Connect a wallet to save account details.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-sm">Organization</h2>
        <p className="text-muted-foreground text-sm">
          Invite teammates, assign roles, and switch the active org.
        </p>
        <OrganizationSettings />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium text-sm">Wallet</h2>
        <p className="break-all text-muted-foreground text-sm">
          {walletAddress || "No wallet linked. Use Connect wallet."}
        </p>
        {gaslessEnabled ? (
          <p className="text-muted-foreground text-xs">
            {gaslessLabel(gasMode, gasAsset)}
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
          disabled={!hasWalletAccess}
          onClick={onOpenIntegrations}
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
        <Button
          disabled={!hasWalletAccess}
          onClick={onOpenApiKeys}
          variant="outline"
        >
          Manage API keys
        </Button>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  const { isPending: sessionPending } = useSession();
  const { hasWalletAccess, isPending: walletAccessPending } = useWalletAccess();
  const { open } = useOverlay();
  const [saving, setSaving] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [gaslessEnabled, setGaslessEnabled] = useState(false);
  const [gasMode, setGasMode] = useState<string | null>(null);
  const [gasAsset, setGasAsset] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!hasWalletAccess) {
      return;
    }
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
    }
  }, [hasWalletAccess]);

  useEffect(() => {
    if (sessionPending || walletAccessPending) {
      return;
    }
    if (!hasWalletAccess) {
      return;
    }
    loadAll();
    const onLinked = () => {
      start(loadAll());
    };
    window.addEventListener("graphitti:wallet-linked", onLinked);
    return () =>
      window.removeEventListener("graphitti:wallet-linked", onLinked);
  }, [hasWalletAccess, sessionPending, walletAccessPending, loadAll]);

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

  const showSpinner = sessionPending;

  return (
    <PageShell
      description="Account, organization, wallet, connections, and API keys."
      title="Settings"
    >
      {showSpinner ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <SettingsBody
          accountEmail={accountEmail}
          accountName={accountName}
          gasAsset={gasAsset}
          gaslessEnabled={gaslessEnabled}
          gasMode={gasMode}
          hasWalletAccess={hasWalletAccess}
          onEmailChange={setAccountEmail}
          onNameChange={setAccountName}
          onOpenApiKeys={() => open(ApiKeysOverlay)}
          onOpenIntegrations={() => open(IntegrationsOverlay)}
          onSaveAccount={saveAccount}
          saving={saving}
          walletAddress={walletAddress}
        />
      )}
    </PageShell>
  );
}
