"use client";

import { Check, Plug, Play, Store, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { IntegrationsOverlay } from "@/components/overlays/integrations-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import { Button } from "@/components/ui/button";
import type { GettingStartedProgress } from "@/lib/hooks/use-getting-started";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "create" as const,
    icon: Workflow,
    title: "Create a workflow",
    body: "Start from a blank canvas and add a trigger plus actions.",
  },
  {
    key: "connect" as const,
    icon: Plug,
    title: "Connect a service",
    body: "Add credentials so steps can call The Graph, email, or wallets.",
  },
  {
    key: "run" as const,
    icon: Play,
    title: "Run it once",
    body: "Execute from the toolbar to confirm the path works end to end.",
  },
  {
    key: "list" as const,
    icon: Store,
    title: "List it on the marketplace",
    body: "Publish a paid or free endpoint agents can call in Arc USDC.",
  },
] as const;

type GettingStartedChecklistProps = {
  progress: GettingStartedProgress;
  onClose?: () => void;
};

export function GettingStartedChecklist({
  progress,
  onClose,
}: GettingStartedChecklistProps): React.ReactElement {
  const router = useRouter();
  const { closeAll, open } = useOverlay();

  const go = (href: string): void => {
    onClose?.();
    closeAll();
    router.push(href);
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-1">
        {STEPS.map((step) => {
          const complete = progress[step.key];
          return (
            <li key={step.key}>
              <div
                className={cn(
                  "flex gap-3 rounded-md p-2",
                  complete && "opacity-70"
                )}
                data-complete={complete}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    complete
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40"
                  )}
                >
                  {complete ? (
                    <Check className="size-3" />
                  ) : (
                    <step.icon className="size-3 text-muted-foreground" />
                  )}
                </span>
                <div>
                  <p className="font-medium text-sm">{step.title}</p>
                  <p className="text-muted-foreground text-xs">{step.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => go("/")}
          size="sm"
        >
          New workflow
        </Button>
        <Button
          onClick={() => {
            onClose?.();
            open(IntegrationsOverlay);
          }}
          size="sm"
          variant="outline"
        >
          Add connection
        </Button>
        <Button
          onClick={() => go("/hub?tab=marketplace")}
          size="sm"
          variant="outline"
        >
          Browse marketplace
        </Button>
      </div>
    </div>
  );
}
