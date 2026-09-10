"use client";

import { useAtomValue } from "jotai";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/address-utils";
import {
  GET_ORG_WALLET_ACTION,
  isUnresolvedWalletId,
  orgWalletTemplate,
} from "@/lib/workflow/bind-org-wallet-nodes";
import { nodesAtom, type WorkflowNode } from "@/lib/workflow-store";

type TreasuryPayload = {
  treasury: {
    address: string;
    privyWalletId: string;
  } | null;
};

function applyTreasuryBinding(input: {
  config: Record<string, unknown>;
  treasury: { address: string; privyWalletId: string };
  nodes: WorkflowNode[];
  hasWalletIdField: boolean;
  isOrgWalletNode: boolean;
  onUpdateConfig: (key: string, value: string) => void;
}): void {
  if (input.isOrgWalletNode) {
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

  const orgNode = input.nodes.find(
    (node) => node.data.config?.actionType === GET_ORG_WALLET_ACTION
  );
  input.onUpdateConfig(
    "walletId",
    orgNode
      ? orgWalletTemplate(orgNode.id, orgNode.data.label || "Get org wallet")
      : input.treasury.privyWalletId
  );
}

export function OrgWalletBinding({
  actionType,
  config,
  onUpdateConfig,
  hasWalletIdField,
}: {
  actionType: string;
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  hasWalletIdField: boolean;
}) {
  const nodes = useAtomValue(nodesAtom);
  const boundRef = useRef<string | null>(null);

  const isOrgWalletNode = actionType === GET_ORG_WALLET_ACTION;
  const connectedAddress =
    typeof config.connectedAddress === "string" ? config.connectedAddress : "";

  useEffect(() => {
    if (!(isOrgWalletNode || hasWalletIdField)) {
      return;
    }

    let cancelled = false;
    fetch("/api/treasury")
      .then(async (response) => {
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as TreasuryPayload;
        const treasury = payload.treasury;
        if (!treasury?.privyWalletId || cancelled) {
          return;
        }

        const bindKey = `${actionType}:${treasury.privyWalletId}`;
        if (boundRef.current === bindKey) {
          return;
        }

        applyTreasuryBinding({
          config,
          treasury,
          nodes,
          hasWalletIdField,
          isOrgWalletNode,
          onUpdateConfig,
        });
        boundRef.current = bindKey;
      })
      .catch(() => {
        // Ignore fetch errors; the node stays disconnected until Treasury is available.
      });

    return () => {
      cancelled = true;
    };
  }, [
    actionType,
    config,
    hasWalletIdField,
    isOrgWalletNode,
    nodes,
    onUpdateConfig,
  ]);

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
