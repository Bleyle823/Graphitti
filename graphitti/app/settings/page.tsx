"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiKeysOverlay } from "@/components/overlays/api-keys-overlay";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { PageShell } from "@/components/page-shell";
import { AccountInvitations } from "@/components/settings/account-invitations";
import { AccountSettings } from "@/components/settings/account-settings";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  section: "account" | "organization";
  onSectionChange: (value: string) => void;
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
  section,
  onSectionChange,
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
    <Tabs onValueChange={onSectionChange} value={section}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="organization">Organization</TabsTrigger>
      </TabsList>
      <TabsContent className="max-w-xl space-y-8 pt-6" value="account">
        <section className="space-y-4">
          <h2 className="font-medium text-sm">Profile</h2>
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
          <h2 className="font-medium text-sm">Invitations</h2>
          <p className="text-muted-foreground text-sm">
            Pending organization invites for your account email.
          </p>
          <AccountInvitations />
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
      </TabsContent>
      <TabsContent className="max-w-xl space-y-4 pt-6" value="organization">
        <p className="text-muted-foreground text-sm">
          Invite teammates, assign roles, and manage membership for the active
          organization.
        </p>
        <OrganizationSettings />
      </TabsContent>
    </Tabs>
  );
}

export default function SettingsPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <PageShell
          description="Account, organization, wallet, connections, and API keys."
          title="Settings"
        >
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        </PageShell>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}

function SettingsPageContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const section: "account" | "organization" =
    sectionParam === "organization" ? "organization" : "account";

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

  const handleSectionChange = (value: string): void => {
    const next = value === "organization" ? "organization" : "account";
    router.replace(
      next === "account" ? "/settings" : `/settings?section=${next}`
    );
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
          onSectionChange={handleSectionChange}
          saving={saving}
          section={section}
          walletAddress={walletAddress}
        />
      )}
    </PageShell>
  );
}
