"use client";

import { Building2, Plus, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
    autoPolicyId: string | null;
    humanPolicyId: string | null;
  } | null;
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

export function TreasuryPage(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [fundAmount, setFundAmount] = useState("10");
  const [fundLoading, setFundLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [payeeOpen, setPayeeOpen] = useState(false);
  const [payeeLabel, setPayeeLabel] = useState("");
  const [payeeAddress, setPayeeAddress] = useState("");
  const [payeeAmount, setPayeeAmount] = useState("25");

  const loadTreasury = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTreasury();
  }, [loadTreasury]);

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
    if (!data?.activeOrganizationId) {
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
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error ?? "Failed to add payee");
      return;
    }
    setPayeeOpen(false);
    setPayeeLabel("");
    setPayeeAddress("");
    toast.success("Payee added");
    await loadTreasury();
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
              onValueChange={(value) => void handleSetActiveOrg(value)}
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="size-4" />
                    Org wallet
                  </CardTitle>
                  <CardDescription>
                    Base Sepolia treasury controlled by Privy policies and key
                    quorums.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Address</div>
                    <div className="break-all font-mono">
                      {data.treasury?.address ?? "Provisioning..."}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Auto spend cap</div>
                    <div>{data.treasury?.autoSpendCapUsdc ?? "50"} USDC</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Operator policy</div>
                    <div className="font-mono text-xs">
                      {data.treasury?.autoPolicyId ?? "Pending"}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Input
                      onChange={(event) => setFundAmount(event.target.value)}
                      placeholder="Amount"
                      value={fundAmount}
                    />
                    <Button
                      disabled={fundLoading}
                      onClick={() => void handleFundTreasury()}
                    >
                      Fund treasury
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Live financial flow: Privy wallet transfer from your
                    connected embedded wallet.
                  </p>
                </CardContent>
              </Card>

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
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending intents</CardTitle>
                <CardDescription>
                  High-value transfers waiting for owner quorum approval via
                  Privy intents.
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
                          {intent.toAddress ?? "-"} · {intent.amountUsdc ?? "-"}{" "}
                          USDC
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{intent.status}</span>
                        {intent.status === "pending" &&
                        (data.role === "owner" || data.role === "admin") ? (
                          <Button
                            onClick={() =>
                              void handleApproveIntent(intent.privyIntentId)
                            }
                            size="sm"
                            variant="outline"
                          >
                            Approve
                          </Button>
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
            <Button onClick={() => void handleCreateOrg()}>Create</Button>
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
            <Button onClick={() => void handleAddPayee()}>Save payee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
