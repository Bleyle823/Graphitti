"use client";

import { useAtomValue } from "jotai";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/address-utils";
import {
  GET_ORG_WALLET_ACTION,
  isUnresolvedWalletId,
  resolveWalletIdBinding,
} from "@/lib/workflow/bind-org-wallet-nodes";
import {
  edgesAtom,
  nodesAtom,
  type WorkflowEdge,
  type WorkflowNode,
} from "@/lib/workflow-store";

type TreasuryPayload = {
  treasury: {
    address: string;
    privyWalletId: string;
  } | null;
};

type PersonalWalletPayload = {
  privyWalletId: string | null;
  address: string | null;
};

function applyWalletBinding(input: {
  config: Record<string, unknown>;
  treasury: TreasuryPayload["treasury"];
  personalWallet: PersonalWalletPayload;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  currentNodeId?: string;
  hasWalletIdField: boolean;
  isOrgWalletNode: boolean;
  onUpdateConfig: (key: string, value: string) => void;
}): void {
  if (input.isOrgWalletNode && input.treasury?.privyWalletId) {
    if (input.config.connectedWalletId !== input.treasury.privyWalletId) {
      input.onUpdateConfig("connectedWalletId", input.treasury.privyWalletId);
    }
    if (input.config.connectedAddress !== input.treasury.address) {
      input.onUpdateConfig("connectedAddress", input.treasury.address);
    }
  }

  if (
    !(input.hasWalletIdField && isUnresolvedWalletId(input.config.walletId))
  ) {
    return;
  }

  const nextWalletId = resolveWalletIdBinding({
    nodes: input.nodes,
    edges: input.edges,
    currentNodeId: input.currentNodeId,
    treasury: input.treasury,
    personalWalletId: input.personalWallet.privyWalletId,
  });

  if (nextWalletId && nextWalletId !== input.config.walletId) {
    input.onUpdateConfig("walletId", nextWalletId);
  }
}

export function OrgWalletBinding({
  actionType,
  config,
  currentNodeId,
  onUpdateConfig,
  hasWalletIdField,
}: {
  actionType: string;
  config: Record<string, unknown>;
  currentNodeId?: string;
  onUpdateConfig: (key: string, value: string) => void;
  hasWalletIdField: boolean;
}) {
  const nodes = useAtomValue(nodesAtom);
  const edges = useAtomValue(edgesAtom);
  const boundRef = useRef<string | null>(null);

  const isOrgWalletNode = actionType === GET_ORG_WALLET_ACTION;
  const connectedAddress =
    typeof config.connectedAddress === "string" ? config.connectedAddress : "";

  useEffect(() => {
    if (!(isOrgWalletNode || hasWalletIdField)) {
      return;
    }

    let cancelled = false;

    Promise.all([
      fetch("/api/treasury").then(async (response) =>
        response.ok ? ((await response.json()) as TreasuryPayload) : null
      ),
      fetch("/api/privy/wallet").then(async (response) =>
        response.ok ? ((await response.json()) as PersonalWalletPayload) : null
      ),
    ])
      .then(([treasuryPayload, personalPayload]) => {
        if (cancelled) {
          return;
        }

        const treasury = treasuryPayload?.treasury ?? null;
        const personalWallet: PersonalWalletPayload = {
          privyWalletId: personalPayload?.privyWalletId ?? null,
          address: personalPayload?.address ?? null,
        };

        const bindKey = [
          actionType,
          currentNodeId ?? "",
          treasury?.privyWalletId ?? "",
          personalWallet.privyWalletId ?? "",
          nodes.map((node) => node.id).join(","),
        ].join(":");
        if (boundRef.current === bindKey) {
          return;
        }

        applyWalletBinding({
          config,
          treasury,
          personalWallet,
          nodes,
          edges,
          currentNodeId,
          hasWalletIdField,
          isOrgWalletNode,
          onUpdateConfig,
        });
        boundRef.current = bindKey;
      })
      .catch(() => {
        // Ignore fetch errors; the node stays disconnected until wallets are available.
      });

    return () => {
      cancelled = true;
    };
  }, [
    actionType,
    config,
    currentNodeId,
    edges,
    hasWalletIdField,
    isOrgWalletNode,
    nodes,
    onUpdateConfig,
  ]);

  useEffect(() => {
    const onTreasuryDeleted = (): void => {
      boundRef.current = null;
    };
    window.addEventListener("graphitti:treasury-deleted", onTreasuryDeleted);
    window.addEventListener("graphitti:treasury-ready", onTreasuryDeleted);
    window.addEventListener("graphitti:wallet-linked", onTreasuryDeleted);
    return () => {
      window.removeEventListener(
        "graphitti:treasury-deleted",
        onTreasuryDeleted
      );
      window.removeEventListener("graphitti:treasury-ready", onTreasuryDeleted);
      window.removeEventListener("graphitti:wallet-linked", onTreasuryDeleted);
    };
  }, []);

  if (!isOrgWalletNode) {
    return null;
  }

  if (connectedAddress) {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <div className="font-medium">Connected org wallet</div>
        <div className="font-mono text-muted-foreground text-xs">
          {truncateAddress(connectedAddress)}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="font-medium">No org wallet yet</div>
      <p className="text-muted-foreground text-xs">
        Create an organization wallet in Treasury to connect this node.
      </p>
      <Button asChild className="mt-2" size="sm" variant="outline">
        <Link href="/treasury">Open Treasury</Link>
      </Button>
    </div>
  );
}
