import { Suspense } from "react";
import { HubPage } from "@/components/hub/hub-page";

export default function HubRoute() {
  return (
    <Suspense
      fallback={
        <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))" />
      }
    >
      <HubPage />
    </Suspense>
  );
}
