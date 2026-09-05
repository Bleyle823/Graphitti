"use client";

import { usePathname } from "next/navigation";
import { WorkflowCanvas } from "./workflow-canvas";

export function PersistentCanvas() {
  const pathname = usePathname();

  // Show canvas on homepage and workflow pages
  const showCanvas = pathname === "/" || pathname.startsWith("/workflows/");

  if (!showCanvas) {
    return null;
  }

  return (
    <div className="fixed top-(--header-height) right-0 bottom-0 left-0 z-0 md:left-(--nav-content-offset,var(--nav-sidebar-width,200px))">
      <WorkflowCanvas />
    </div>
  );
}
