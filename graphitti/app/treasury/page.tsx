import { Suspense } from "react";
import { TreasuryPage } from "@/components/treasury/treasury-page";

export default function TreasuryRoute() {
  return (
    <Suspense
      fallback={
        <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))" />
      }
    >
      <TreasuryPage />
    </Suspense>
  );
}
