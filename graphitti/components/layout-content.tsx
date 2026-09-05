"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtom } from "jotai";
import { type ReactNode, Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthDialog } from "@/components/auth/dialog";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { PersistentCanvas } from "@/components/workflow/persistent-canvas";
import { authPromptOpenAtom } from "@/lib/ui-store";

export function LayoutContent({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [authOpen, setAuthOpen] = useAtom(authPromptOpenAtom);

  return (
    <ReactFlowProvider>
      <AppHeader />
      <PersistentCanvas />
      <Suspense fallback={null}>
        <NavigationSidebar />
      </Suspense>
      <div className="pointer-events-none relative z-10">{children}</div>
      <AuthDialog onOpenChange={setAuthOpen} open={authOpen} />
    </ReactFlowProvider>
  );
}
