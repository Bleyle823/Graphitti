"use client";

import type { NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AddNodeData = {
  onClick?: () => void;
};

export function AddNode({ data }: NodeProps & { data?: AddNodeData }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 rounded-lg border border-border border-dashed bg-background/50 p-8 backdrop-blur-sm">
      <div className="max-w-md text-center">
        <h1 className="mb-2 font-bold text-3xl">Graphitti</h1>
        <p className="text-muted-foreground text-sm">
          Connect a wallet, compose triggers and plugin actions, then run in the
          browser or publish to the marketplace.
        </p>
        <p className="mt-2 text-muted-foreground text-xs">
          Circle, Arc, Privy, The Graph, and Fantasy Premier League examples
          appear in Workflows after you connect.
        </p>
      </div>
      <Button className="gap-2 shadow-lg" onClick={data.onClick} size="default">
        <Plus className="size-4" />
        Add a Step
      </Button>
    </div>
  );
}
