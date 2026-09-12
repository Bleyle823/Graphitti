"use client";

import { Building2, Check, ChevronsUpDown, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { refetchSidebar } from "@/lib/refetch-sidebar";
import { cn } from "@/lib/utils";

export function OrgSwitcher(): React.ReactElement | null {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const { data: organizations, isPending: orgsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization, isPending: activePending } =
    authClient.useActiveOrganization();

  if (sessionPending || orgsPending || activePending || !session?.user) {
    return null;
  }

  const orgs = organizations ?? [];
  if (orgs.length === 0) {
    return null;
  }

  const activeId = activeOrganization?.id ?? null;
  const activeName =
    activeOrganization?.name ?? (activeId ? "Organization" : "Personal");

  async function selectOrg(organizationId: string | null): Promise<void> {
    if (organizationId) {
      await authClient.organization.setActive({ organizationId });
    } else {
      await authClient.organization.setActive({ organizationId: null });
    }
    refetchSidebar();
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="hidden h-8 gap-1.5 px-2 sm:inline-flex"
          data-testid="header-org-switcher"
          variant="outline"
        >
          <Building2 className="size-3.5 shrink-0" />
          <span className="max-w-[140px] truncate text-sm">{activeName}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56">
        <DropdownMenuLabel>Organization</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => selectOrg(null)}>
          <span className={cn(!activeId && "font-medium")}>Personal</span>
          {activeId ? null : <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => selectOrg(org.id)}>
            <span
              className={cn("truncate", activeId === org.id && "font-medium")}
            >
              {org.name}
            </span>
            {activeId === org.id ? (
              <Check className="ml-auto size-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            className="flex cursor-pointer items-center gap-2"
            href="/settings?section=organization"
          >
            <Settings2 className="size-4" />
            Organization settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
