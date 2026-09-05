"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccountSettings } from "@/components/settings/account-settings";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api-client";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";

type SettingsOverlayProps = {
  overlayId: string;
};

export function SettingsOverlay({ overlayId }: SettingsOverlayProps) {
  const { closeAll } = useOverlay();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account state
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [gaslessEnabled, setGaslessEnabled] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const data = await api.user.get();
      setAccountName(data.name || "");
      setAccountEmail(data.email || "");
    } catch (error) {
      console.error("Failed to load account:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await loadAccount();
      const wallet = await api.marketplace.wallet().catch(() => null);
      setWalletAddress(wallet?.address ?? null);
      setGaslessEnabled(Boolean(wallet?.gaslessEnabled));
    } finally {
      setLoading(false);
    }
  }, [loadAccount]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveAccount = async () => {
    try {
      setSaving(true);
      await api.user.update({ name: accountName, email: accountEmail });
      await loadAccount();
      toast.success("Settings saved");
      closeAll();
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay
      actions={[
        { label: "Cancel", variant: "outline", onClick: closeAll },
        {
          label: "Save",
          onClick: saveAccount,
          loading: saving,
          disabled: loading,
        },
      ]}
      overlayId={overlayId}
      title="Settings"
    >
      <p className="-mt-2 mb-4 text-muted-foreground text-sm">
        Update your personal information
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <AccountSettings
            accountEmail={accountEmail}
            accountName={accountName}
            onEmailChange={setAccountEmail}
            onNameChange={setAccountName}
          />
          <div className="space-y-2">
            <p className="font-medium text-sm">Privy wallet</p>
            <p className="break-all text-muted-foreground text-sm">
              {walletAddress || "No wallet linked. Use Connect wallet."}
            </p>
            {gaslessEnabled ? (
              <p className="text-muted-foreground text-xs">Gasless enabled</p>
            ) : null}
          </div>
        </div>
      )}
    </Overlay>
  );
}
