"use client";

import { Building2, Plus, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type TreasuryResponse = {
  organizations: Array<{
    organizationId: string;
    role: string;
    name: string;
    slug: string;
  }>;
  activeOrganizationId: string | null;
  role?: string;
  treasury: {
    address: string;
    privyWalletId: string;
    autoSpendCapUsdc: string;
    dailySpendCapUsdc: string | null;
    autoPolicyId: string | null;
    humanPolicyId: string | null;
  } | null;
  dailySpendUsedUsdc?: string;
  payees: Array<{
    id: string;
    label: string;
    address: string;
    defaultAmountUsdc: string | null;
    chain: string;
  }>;
  intents: Array<{
    id: string;
    privyIntentId: string;
    amountUsdc: string | null;
    toAddress: string | null;
    status: string;
    txHash: string | null;
  }>;
};

type OrgWalletCardProps = {
  treasury: TreasuryResponse["treasury"];
  dailySpendUsedUsdc: string;
  canManage: boolean;
  autoCap: string;
  dailyCap: string;
  capSaving: boolean;
  fundAmount: string;
  fundLoading: boolean;
  provisioning: boolean;
  provisionError: string | null;
  onAutoCapChange: (value: string) => void;
  onDailyCapChange: (value: string) => void;
  onSaveCaps: () => void;
  onFundAmountChange: (value: string) => void;
  onFund: () => void;
  onProvision: () => void;
  onDelete: () => void;
  deleteLoading: boolean;
};

function treasuryDeletedStorageKey(organizationId: string): string {
  return `graphitti:treasury-deleted:${organizationId}`;
}

function isTreasuryDeletedForOrg(organizationId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    sessionStorage.getItem(treasuryDeletedStorageKey(organizationId)) === "1"
  );
}

function markTreasuryDeletedForOrg(organizationId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(treasuryDeletedStorageKey(organizationId), "1");
}

function clearTreasuryDeletedForOrg(organizationId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(treasuryDeletedStorageKey(organizationId));
}

function treasuryAddressLabel(
  address: string | undefined,
  provisioning: boolean
): string {
  if (address) {
    return address;
  }
  if (provisioning) {
    return "Provisioning address...";
  }
  return "Not provisioned";
}

function start(task: Promise<unknown>): void {
  task.catch(() => {
    /* errors are toasted by the async handler */
  });
}

function OrgWalletCard({
  treasury,
  dailySpendUsedUsdc,
  canManage,
  autoCap,
  dailyCap,
  capSaving,
  fundAmount,
  fundLoading,
  provisioning,
  provisionError,
  onAutoCapChange,
  onDailyCapChange,
  onSaveCaps,
  onFundAmountChange,
  onFund,
  onProvision,
  onDelete,
  deleteLoading,
}: OrgWalletCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4" />
          Org wallet
        </CardTitle>
        <CardDescription>
          Base Sepolia treasury controlled by Privy policies and key quorums.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground">Address</div>
          <div className="break-all font-mono">
            {treasuryAddressLabel(treasury?.address, provisioning)}
          </div>
          {provisionError ? (
            <p className="pt-2 text-destructive text-xs">{provisionError}</p>
          ) : null}
        </div>
        <div>
          <div className="text-muted-foreground">Spend caps</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                Auto (per transfer)
              </div>
              <Input
                data-testid="spend-cap-auto"
                disabled={!canManage}
                onChange={(event) => onAutoCapChange(event.target.value)}
                value={autoCap}
              />
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Daily (UTC)</div>
              <Input
                data-testid="spend-cap-daily"
                disabled={!canManage}
                onChange={(event) => onDailyCapChange(event.target.value)}
                placeholder="Unlimited"
                value={dailyCap}
              />
            </div>
          </div>
          <div className="pt-2 text-muted-foreground text-xs">
            Used today: {dailySpendUsedUsdc} USDC
            {dailyCap ? ` / ${dailyCap} USDC` : ""}
          </div>
          {canManage ? (
            <Button
              className="mt-2"
              data-testid="spend-cap-save"
              disabled={capSaving}
              onClick={onSaveCaps}
              size="sm"
              variant="outline"
            >
              {capSaving ? "Saving..." : "Save caps"}
            </Button>
          ) : null}
        </div>
        <div>
          <div className="text-muted-foreground">Operator policy</div>
          <div className="font-mono text-xs">
            {treasury?.autoPolicyId ?? "Pending"}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Input
            onChange={(event) => onFundAmountChange(event.target.value)}
            placeholder="Amount"
            value={fundAmount}
          />
          {treasury?.address ? (
            <Button disabled={fundLoading} onClick={onFund}>
              Fund treasury
            </Button>
          ) : (
            <Button
              disabled={provisioning}
              onClick={onProvision}
              variant="outline"
            >
              {provisioning ? "Provisioning..." : "Provision wallet"}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          Live financial flow: Privy wallet transfer from your connected
          embedded wallet.
        </p>
        {treasury?.address && canManage ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="mt-2"
                data-testid="delete-treasury"
                disabled={deleteLoading}
                size="sm"
                variant="destructive"
              >
                {deleteLoading ? "Deleting..." : "Delete treasury"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete treasury wallet?</AlertDialogTitle>
                <AlertDialogDescription>
                  Operator payroll and policy-gated transfers stop. Your
                  personal embedded wallet is used for normal signing again.
                  Funds stay on-chain at the treasury address; they are not
                  swept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Delete treasury
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function TreasuryPage(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [fundAmount, setFundAmount] = useState("10");
  const [autoCap, setAutoCap] = useState("50");
  const [dailyCap, setDailyCap] = useState("");
  const [capSaving, setCapSaving] = useState(false);
  const [fundLoading, setFundLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [payeeOpen, setPayeeOpen] = useState(false);
  const [payeeLabel, setPayeeLabel] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [payeeAmount, setPayeeAmount] = useState("25");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const autoProvisionedOrgRef = useRef<string | null>(null);

  const loadTreasury = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/treasury");
      if (!response.ok) {
        throw new Error("Failed to load treasury");
      }
      setData(await response.json());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load treasury"
      );
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!data?.treasury) {
      return;
    }
    setAutoCap(data.treasury.autoSpendCapUsdc ?? "10");
    setDailyCap(data.treasury.dailySpendCapUsdc ?? "");
  }, [data?.treasury]);

  const provisionTreasury = useCallback(
    async (organizationId: string): Promise<boolean> => {
      setProvisioning(true);
      setProvisionError(null);
      try {
        const response = await fetch("/api/treasury/provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId }),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Failed to provision treasury");
        }
        await loadTreasury(true);
        if (typeof window !== "undefined") {
          clearTreasuryDeletedForOrg(organizationId);
          window.dispatchEvent(new Event("graphitti:treasury-ready"));
        }
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to provision treasury";
        setProvisionError(message);
        toast.error(message);
        return false;
      } finally {
        setProvisioning(false);
      }
    },
    [loadTreasury]
  );

  useEffect(() => {
    start(loadTreasury());
  }, [loadTreasury]);

  useEffect(() => {
    const organizationId = data?.activeOrganizationId;
    if (!organizationId || data.treasury?.address || loading) {
      return;
    }
    if (
      autoProvisionedOrgRef.current === organizationId ||
      isTreasuryDeletedForOrg(organizationId)
    ) {
      return;
    }
    autoProvisionedOrgRef.current = organizationId;
    start(provisionTreasury(organizationId));
  }, [
    data?.activeOrganizationId,
    data?.treasury?.address,
    loading,
    provisionTreasury,
  ]);

  useEffect(() => {
    const onWalletLinked = (): void => {
      const organizationId = data?.activeOrganizationId;
      if (
        !organizationId ||
        data.treasury?.address ||
        isTreasuryDeletedForOrg(organizationId)
      ) {
        return;
      }
      autoProvisionedOrgRef.current = null;
      start(provisionTreasury(organizationId));
    };
    window.addEventListener("graphitti:wallet-linked", onWalletLinked);
    return () =>
      window.removeEventListener("graphitti:wallet-linked", onWalletLinked);
  }, [data?.activeOrganizationId, data?.treasury?.address, provisionTreasury]);

  async function handleSetActiveOrg(organizationId: string) {
    await authClient.organization.setActive({ organizationId });
    await loadTreasury();
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) {
      return;
    }
    const slug = orgName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const result = await authClient.organization.create({
      name: orgName.trim(),
      slug,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Failed to create organization");
      return;
    }
    if (result.data?.id) {
      await authClient.organization.setActive({
        organizationId: result.data.id,
      });
    }
    setCreateOpen(false);
    setOrgName("");
    toast.success("Organization created");
    await loadTreasury();
  }

  async function handleFundTreasury() {
    if (!(data?.activeOrganizationId && data.treasury?.address)) {
      return;
    }
    setFundLoading(true);
    try {
      const response = await fetch("/api/treasury/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: data.activeOrganizationId,
          amount: fundAmount,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Funding failed");
      }
      toast.success("Treasury funding submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Funding failed");
    } finally {
      setFundLoading(false);
    }
  }

  async function handleDeleteTreasury() {
    if (!data?.activeOrganizationId) {
      return;
    }
    setDeleteLoading(true);
    try {
      const response = await fetch("/api/treasury", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: data.activeOrganizationId,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to delete treasury");
      }
      markTreasuryDeletedForOrg(data.activeOrganizationId);
      autoProvisionedOrgRef.current = data.activeOrganizationId;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("graphitti:treasury-deleted"));
      }
      toast.success("Treasury deleted. Personal signing restored.");
      await loadTreasury(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete treasury"
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAddPayee() {
    if (!data?.activeOrganizationId) {
      return;
    }
    const response = await fetch("/api/treasury/payees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: data.activeOrganizationId,
        label: payeeLabel,
        address: payeeAddress,
        defaultAmountUsdc: payeeAmount,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      policyWarning?: string;
    };
    if (!response.ok) {
      toast.error(result.error ?? "Failed to add payee");
      return;
    }
    setPayeeOpen(false);
    setPayeeLabel("");
    setPayeeAddress("");
    if (result.policyWarning) {
      toast.success("Payee saved. Policy sync will retry on the next edit.");
    } else {
      toast.success("Payee added");
    }
    await loadTreasury();
  }

  async function handleDeletePayee(payeeId: string) {
    if (!data?.activeOrganizationId) {
      return;
    }
    const response = await fetch(
      `/api/treasury/payees?id=${encodeURIComponent(payeeId)}&organizationId=${encodeURIComponent(data.activeOrganizationId)}`,
      { method: "DELETE" }
    );
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast.error(result.error ?? "Failed to remove payee");
      return;
    }
    toast.success("Payee removed");
    await loadTreasury();
  }

  async function handleSaveCaps() {
    if (!data?.activeOrganizationId) {
      return;
    }
    setCapSaving(true);
    try {
      const response = await fetch("/api/treasury/spend-cap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: data.activeOrganizationId,
          autoSpendCapUsdc: autoCap,
          dailySpendCapUsdc: dailyCap === "" ? null : dailyCap,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        policyWarning?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save spend caps");
      }
      if (result.policyWarning) {
        toast.success("Caps saved. Policy sync will retry on the next edit.");
      } else {
        toast.success("Spend caps updated");
      }
      await loadTreasury();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save spend caps"
      );
    } finally {
      setCapSaving(false);
    }
  }

  async function handleApproveIntent(intentId: string) {
    if (!data?.activeOrganizationId) {
      return;
    }
    const response = await fetch(`/api/treasury/intents/${intentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: data.activeOrganizationId }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error ?? "Failed to approve intent");
      return;
    }
    toast.success("Intent approved");
    await loadTreasury();
  }

  async function handleRejectIntent(intentId: string) {
    if (!data?.activeOrganizationId) {
      return;
    }
    const response = await fetch(`/api/treasury/intents/${intentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: data.activeOrganizationId,
        action: "reject",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error ?? "Failed to reject intent");
      return;
    }
    toast.success("Intent rejected");
    await loadTreasury();
  }

  if (loading) {
    return (
      <div className="pointer-events-auto flex min-h-dvh items-center justify-center bg-background pt-(--header-height) md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-semibold text-3xl">Treasury</h1>
            <p className="text-muted-foreground text-sm">
              Shared Privy org wallets with policies, payees, and quorum
              approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              onValueChange={(value) => start(handleSetActiveOrg(value))}
              value={data?.activeOrganizationId ?? undefined}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {data?.organizations.map((org) => (
                  <SelectItem
                    key={org.organizationId}
                    value={org.organizationId}
                  >
                    {org.name} ({org.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)} variant="outline">
              <Building2 className="mr-2 size-4" />
              New org
            </Button>
          </div>
        </div>

        {data?.activeOrganizationId ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <OrgWalletCard
                autoCap={autoCap}
                canManage={data.role === "owner" || data.role === "admin"}
                capSaving={capSaving}
                dailyCap={dailyCap}
                dailySpendUsedUsdc={data.dailySpendUsedUsdc ?? "0"}
                deleteLoading={deleteLoading}
                fundAmount={fundAmount}
                fundLoading={fundLoading}
                onAutoCapChange={setAutoCap}
                onDailyCapChange={setDailyCap}
                onDelete={() => start(handleDeleteTreasury())}
                onFund={() => start(handleFundTreasury())}
                onFundAmountChange={setFundAmount}
                onProvision={() => {
                  if (!data.activeOrganizationId) {
                    return;
                  }
                  clearTreasuryDeletedForOrg(data.activeOrganizationId);
                  autoProvisionedOrgRef.current = null;
                  start(provisionTreasury(data.activeOrganizationId));
                }}
                onSaveCaps={() => start(handleSaveCaps())}
                provisionError={provisionError}
                provisioning={provisioning}
                treasury={data.treasury}
              />

              <Card>
                <CardHeader>
                  <CardTitle>Mock card onramp</CardTitle>
                  <CardDescription>
                    Privy Cards require guided onboarding. This button is a
                    mocked UX only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button disabled variant="secondary">
                    Add funds with card (mock)
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payee book</CardTitle>
                  <CardDescription>
                    Allowlisted contractor addresses for policy-gated payroll
                    workflows.
                  </CardDescription>
                </div>
                <Button onClick={() => setPayeeOpen(true)} size="sm">
                  <Plus className="mr-2 size-4" />
                  Add payee
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.payees.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No payees yet</p>
                ) : (
                  data.payees.map((payee) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      key={payee.id}
                    >
                      <div>
                        <div className="font-medium">{payee.label}</div>
                        <div className="font-mono text-xs">{payee.address}</div>
                      </div>
                      <div>{payee.defaultAmountUsdc ?? "-"} USDC</div>
                      {data.role === "owner" || data.role === "admin" ? (
                        <Button
                          onClick={() => start(handleDeletePayee(payee.id))}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove payee</span>
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card data-testid="pending-intents">
              <CardHeader>
                <CardTitle>Pending intents</CardTitle>
                <CardDescription>
                  High-value transfers waiting for owner or admin approval via
                  Privy intents. Recipient and amount are frozen at create time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.intents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No intents yet
                  </p>
                ) : (
                  data.intents.map((intent) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      key={intent.id}
                    >
                      <div>
                        <div className="font-mono text-xs">
                          {intent.privyIntentId}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Bound {intent.toAddress ?? "-"} ·{" "}
                          {intent.amountUsdc ?? "-"} USDC
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{intent.status}</span>
                        {intent.status === "pending" &&
                        (data.role === "owner" || data.role === "admin") ? (
                          <>
                            <Button
                              data-testid="intent-approve"
                              onClick={() =>
                                start(handleApproveIntent(intent.privyIntentId))
                              }
                              size="sm"
                              variant="outline"
                            >
                              Approve
                            </Button>
                            <Button
                              data-testid="intent-reject"
                              onClick={() =>
                                start(handleRejectIntent(intent.privyIntentId))
                              }
                              size="sm"
                              variant="ghost"
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create your first organization</CardTitle>
              <CardDescription>
                Organizations get a Privy treasury wallet with spend policies
                and owner quorum controls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCreateOpen(true)}>
                Create organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(event) => setOrgName(event.target.value)}
            placeholder="Acme Treasury"
            value={orgName}
          />
          <DialogFooter>
            <Button onClick={() => start(handleCreateOrg())}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setPayeeOpen} open={payeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add payee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              onChange={(event) => setPayeeLabel(event.target.value)}
              placeholder="Contractor name"
              value={payeeLabel}
            />
            <Input
              onChange={(event) => setPayeeAddress(event.target.value)}
              placeholder="0x..."
              value={payeeAddress}
            />
            <Input
              onChange={(event) => setPayeeAmount(event.target.value)}
              placeholder="Default amount USDC"
              value={payeeAmount}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => start(handleAddPayee())}>Save payee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
