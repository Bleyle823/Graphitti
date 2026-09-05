"use client";

import { useAtom } from "jotai";
import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGettingStarted } from "@/lib/hooks/use-getting-started";
import { gettingStartedOpenAtom } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

function ProgressRing({
  done,
  total,
}: {
  done: number;
  total: number;
}): React.ReactElement {
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? done / total : 0;
  return (
    <svg aria-hidden="true" className="-rotate-90 size-5" viewBox="0 0 20 20">
      <circle
        className="text-muted-foreground/30"
        cx="10"
        cy="10"
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        className="text-primary transition-[stroke-dashoffset] duration-500"
        cx="10"
        cy="10"
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - pct)}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function GettingStartedLauncher({
  compact,
}: {
  compact: boolean;
}): React.ReactElement | null {
  const gs = useGettingStarted();
  const [forceOpen, setForceOpen] = useAtom(gettingStartedOpenAtom);

  useEffect(() => {
    if (forceOpen) {
      gs.reopen();
      setForceOpen(false);
    }
  }, [forceOpen, gs.reopen, setForceOpen]);

  if (!gs.ready || gs.dismissed) {
    return null;
  }

  const pill = (
    <button
      className={cn(
        "flex items-center gap-2 rounded-full border bg-popover shadow-sm transition-colors hover:bg-muted",
        compact ? "size-9 justify-center p-0" : "w-full py-2 pr-4 pl-3",
        gs.expanded && "border-primary/40"
      )}
      data-testid="gs-launcher-pill"
      onClick={() => gs.setExpanded(!gs.expanded)}
      type="button"
    >
      <ProgressRing done={gs.done} total={gs.total} />
      {compact ? null : (
        <>
          <Sparkles className="size-3.5 text-primary" />
          <span className="truncate font-medium text-sm">
            Getting started {gs.done}/{gs.total}
          </span>
        </>
      )}
    </button>
  );

  return (
    <div className="relative px-2.5 pb-2">
      <AnimatePresence>
        {gs.expanded ? (
          <div className="absolute bottom-full left-2.5 z-50 mb-2">
            <motion.div
              animate={{ height: "auto", opacity: 1, scale: 1 }}
              className="w-80 overflow-hidden rounded-xl border bg-popover shadow-xl"
              data-testid="gs-launcher-card"
              exit={{ height: 0, opacity: 0, scale: 0.5 }}
              initial={{ height: 0, opacity: 0, scale: 0.5 }}
              style={{ transformOrigin: "bottom left" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Get started</span>
                  <span className="text-muted-foreground text-xs">
                    {gs.done} of {gs.total}
                  </span>
                  {gs.done === gs.total ? (
                    <Check className="size-3.5 text-primary" />
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Collapse"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => gs.setExpanded(false)}
                    type="button"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                  <button
                    aria-label="Dismiss"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={gs.dismiss}
                    type="button"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
                <GettingStartedChecklist
                  onClose={() => gs.setExpanded(false)}
                  progress={gs.progress}
                />
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{pill}</TooltipTrigger>
          <TooltipContent side="right">
            Getting started {gs.done}/{gs.total}
          </TooltipContent>
        </Tooltip>
      ) : (
        pill
      )}
    </div>
  );
}
