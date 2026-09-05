"use client";

import { useSetAtom } from "jotai";
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist";
import { Overlay } from "@/components/overlays/overlay";
import { useGettingStarted } from "@/lib/hooks/use-getting-started";
import { gettingStartedOpenAtom } from "@/lib/ui-store";

type GettingStartedOverlayProps = {
  overlayId: string;
};

export function GettingStartedOverlay({
  overlayId,
}: GettingStartedOverlayProps) {
  const gs = useGettingStarted();
  const setOpen = useSetAtom(gettingStartedOpenAtom);

  return (
    <Overlay overlayId={overlayId} title="Getting started">
      <p className="mb-4 text-muted-foreground text-sm">
        {gs.done} of {gs.total} steps complete
      </p>
      <GettingStartedChecklist
        onClose={() => setOpen(false)}
        progress={gs.progress}
      />
    </Overlay>
  );
}
