"use client";

import { useSetAtom } from "jotai";
import { BookOpen, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraphittiLogo } from "@/components/graphitti-logo";
import { UserMenu } from "@/components/workflows/user-menu";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { navMobileOpenAtom } from "@/lib/ui-store";

const DOCS_URL = "https://na-834f3010.mintlify.app";

export function AppHeader(): React.ReactElement {
  const isMobile = useIsMobile();
  const setMobileOpen = useSetAtom(navMobileOpenAtom);
  const pathname = usePathname();
  const isEditor =
    pathname === "/" || pathname.startsWith("/workflows/");

  return (
    <header className="pointer-events-auto fixed top-0 right-0 left-0 z-50 flex h-(--header-height) items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {isMobile ? (
          <Button
            aria-label="Open navigation"
            className="size-9"
            onClick={() => setMobileOpen(true)}
            size="icon"
            variant="ghost"
          >
            <Menu className="size-4" />
          </Button>
        ) : null}
        <Link className="flex items-center gap-2 font-medium text-sm" href="/">
          <GraphittiLogo className="size-8" size={32} />
          <span className={isEditor ? "hidden sm:inline" : undefined}>
            Graphitti
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild className="gap-1.5" size="sm" variant="ghost">
          <a href={DOCS_URL} rel="noopener noreferrer" target="_blank">
            <BookOpen className="size-4" />
            Docs
          </a>
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
