"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useAtom } from "jotai";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthDialog } from "@/components/auth/dialog";
import { NavigationSidebar } from "@/components/navigation-sidebar";
import { PersistentCanvas } from "@/components/workflow/persistent-canvas";
import { WorkflowToolbar } from "@/components/workflow/workflow-toolbar";
import { authPromptOpenAtom } from "@/lib/ui-store";

function isWorkflowEditorPath(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/workflows/");
}

export function LayoutContent({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [authOpen, setAuthOpen] = useAtom(authPromptOpenAtom);
  const pathname = usePathname();
  const showWorkflowToolbar = isWorkflowEditorPath(pathname);

  return (
    <ReactFlowProvider>
      <AppHeader />
      <PersistentCanvas />
      {showWorkflowToolbar ? <WorkflowToolbar /> : null}
      <Suspense fallback={null}>
        <NavigationSidebar />
      </Suspense>
      <div className="pointer-events-none relative z-10">{children}</div>
      <AuthDialog onOpenChange={setAuthOpen} open={authOpen} />
    </ReactFlowProvider>
  );
}
