"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { FlyoutState } from "@/lib/hooks/use-persisted-nav-state";
import { cn } from "@/lib/utils";

export const FLYOUT_WIDTH = 260;
export const STRIP_WIDTH = 36;

type FlyoutPanelProps = {
  title: string;
  collapsedLabel: string;
  leftOffset: number;
  state: FlyoutState;
  onCollapse: () => void;
  onExpand: () => void;
  children: ReactNode;
};

export function FlyoutPanel({
  title,
  collapsedLabel,
  leftOffset,
  state,
  onCollapse,
  onExpand,
  children,
}: FlyoutPanelProps): React.ReactElement | null {
  if (state === "closed") {
    return null;
  }

  const collapsed = state === "collapsed";

  return (
    <div
      className={cn(
        "pointer-events-auto fixed top-(--header-height) bottom-0 z-30 flex flex-col border-r bg-background transition-[width,left] duration-200 ease-out",
        collapsed ? "items-center" : ""
      )}
      data-flyout
      style={{
        left: leftOffset,
        width: collapsed ? STRIP_WIDTH : FLYOUT_WIDTH,
      }}
    >
      {collapsed ? (
        <button
          aria-label={`Expand ${title}`}
          className="flex h-full w-full flex-col items-center gap-3 py-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onExpand}
          type="button"
        >
          <ChevronRight className="size-4" />
          <span
            className="text-xs uppercase tracking-wider"
            style={{ writingMode: "vertical-rl" }}
          >
            {collapsedLabel}
          </span>
        </button>
      ) : (
        <>
          <div className="flex h-12 shrink-0 items-center justify-between border-b px-3">
            <p className="truncate font-medium text-sm">{title}</p>
            <button
              aria-label={`Collapse ${title}`}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onCollapse}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">{children}</div>
        </>
      )}
    </div>
  );
}
