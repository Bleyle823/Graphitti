"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Globe,
  Plus,
  Settings,
  Store,
  Wallet,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FLYOUT_WIDTH, FlyoutPanel, STRIP_WIDTH } from "@/components/flyout-panel";
import { GettingStartedLauncher } from "@/components/onboarding/getting-started-launcher";
import { WalletOverlay } from "@/components/overlays/wallet-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkflowPicker } from "@/components/workflows/workflow-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SavedWorkflow } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { authClient, useSession } from "@/lib/auth-client";
import {
  COLLAPSED_WIDTH,
  EXPANDED_WIDTH,
  usePersistedNavState,
} from "@/lib/hooks/use-persisted-nav-state";
import { isAnonymousUser } from "@/lib/is-anonymous";
import { registerSidebarRefetch } from "@/lib/refetch-sidebar";
import { authPromptOpenAtom, navMobileOpenAtom } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const SNAP_THRESHOLD = (COLLAPSED_WIDTH + EXPANDED_WIDTH) / 2;

type NavItemDef = {
  id: string;
  icon: typeof Plus;
  label: string;
  href: string | null;
  requireAuth: boolean;
};

const NAV_ITEMS: NavItemDef[] = [
  { id: "hub", icon: Globe, label: "Hub", href: "/hub", requireAuth: false },
  {
    id: "workflows",
    icon: WorkflowIcon,
    label: "Workflows",
    href: null,
    requireAuth: false,
  },
  {
    id: "marketplace",
    icon: Store,
    label: "Marketplace",
    href: "/hub?tab=marketplace",
    requireAuth: false,
  },
  {
    id: "analytics",
    icon: BarChart3,
    label: "Analytics",
    href: "/analytics",
    requireAuth: true,
  },
  {
    id: "earnings",
    icon: DollarSign,
    label: "Earnings",
    href: "/earnings",
    requireAuth: true,
  },
  {
    id: "activity",
    icon: Activity,
    label: "Activity",
    href: "/activity",
    requireAuth: true,
  },
  {
    id: "wallet",
    icon: Wallet,
    label: "Wallet",
    href: null,
    requireAuth: true,
  },
];

const SETTINGS_NAV_ITEM: NavItemDef = {
  id: "settings",
  icon: Settings,
  label: "Settings",
  href: "/settings",
  requireAuth: true,
};

function visibleWorkflows(workflows: SavedWorkflow[]): SavedWorkflow[] {
  return workflows.filter(
    (workflow) => workflow.name !== "__current__" && !workflow.deletedAt
  );
}

function NavItem({
  item,
  active,
  showLabels,
  onClick,
}: {
  item: NavItemDef;
  active: boolean;
  showLabels: boolean;
  onClick: () => void;
}): React.ReactElement {
  const button = (
    <button
      aria-label={item.label}
      className={cn(
        "flex h-9 w-full items-center rounded-md transition-colors hover:bg-muted",
        showLabels ? "gap-3 px-2" : "justify-center",
        active && "bg-muted"
      )}
      data-testid={`nav-${item.id}`}
      onClick={onClick}
      type="button"
    >
      <item.icon className="size-4 shrink-0" />
      {showLabels ? <span className="truncate text-sm">{item.label}</span> : null}
    </button>
  );

  if (showLabels) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarBody({
  expanded,
  currentWidth,
  showLabels,
  onNewWorkflow,
  onToggle,
  onNavClick,
  isActive,
}: {
  expanded: boolean;
  currentWidth: number;
  showLabels: boolean;
  onNewWorkflow: () => void;
  onToggle: () => void;
  onNavClick: (item: NavItemDef) => void;
  isActive: (id: string) => boolean;
}): React.ReactElement {
  const pathname = usePathname();
  const isSettingsPage = pathname.startsWith("/settings");

  return (
    <>
      <div
        className={cn(
          "flex h-12 shrink-0 items-center overflow-hidden border-b",
          expanded ? "px-3" : "relative justify-center pr-0.5"
        )}
      >
        <button
          aria-label="New Workflow"
          className={cn(
            expanded
              ? "flex items-center gap-1.5 whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-medium text-primary text-sm transition-colors hover:bg-primary/15"
              : "flex items-center justify-center text-primary"
          )}
          data-testid="nav-new"
          onClick={onNewWorkflow}
          type="button"
        >
          <Plus className="size-3.5" />
          {expanded ? <span>New Workflow</span> : null}
        </button>
        <button
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "shrink-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            expanded
              ? "ml-auto rounded-md p-1"
              : "absolute right-0.5 rounded-md p-1"
          )}
          onClick={onToggle}
          type="button"
        >
          {expanded ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex flex-1 flex-col gap-1 overflow-hidden px-2.5 pt-3"
        data-testid="navigation-sidebar"
        style={{ width: currentWidth }}
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            active={isActive(item.id)}
            item={item}
            key={item.id}
            onClick={() => onNavClick(item)}
            showLabels={showLabels}
          />
        ))}
        <div className="mt-auto pb-1">
          <NavItem
            active={isSettingsPage}
            item={SETTINGS_NAV_ITEM}
            onClick={() => onNavClick(SETTINGS_NAV_ITEM)}
            showLabels={showLabels}
          />
        </div>
      </nav>
      <GettingStartedLauncher compact={!showLabels} />
    </>
  );
}

export function NavigationSidebar(): React.ReactElement | null {
  const isMobile = useIsMobile();
  const { data: session, isPending } = useSession();
  const setAuthPromptOpen = useSetAtom(authPromptOpenAtom);
  const [mobileOpen, setMobileOpen] = useAtom(navMobileOpenAtom);
  const { open: openOverlay } = useOverlay();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const navState = usePersistedNavState();
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const isDragging = useRef(false);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setWorkflows(await api.workflow.getAll().catch(() => []));
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) {
      return;
    }
    if (!session?.user || isAnonymousUser(session.user)) {
      setDataLoading(false);
      return;
    }
    fetchData().catch(() => {
      /* ignore */
    });
  }, [isPending, session, fetchData]);

  useEffect(
    () =>
      registerSidebarRefetch((options) => {
        if (options?.closeFlyout) {
          navState.closeFlyout();
        }
        fetchData().catch(() => {
          /* ignore */
        });
      }),
    [fetchData, navState.closeFlyout]
  );

  const isAnonymous = isAnonymousUser(session?.user);
  const workflowId =
    typeof params.workflowId === "string" ? params.workflowId : undefined;
  const expanded = navState.state.sidebar;
  const currentWidth =
    dragWidth ?? (expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH);
  const showLabels = currentWidth >= SNAP_THRESHOLD;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--nav-sidebar-width",
      `${currentWidth}px`
    );
    const flyoutExtra =
      navState.state.flyout === "open"
        ? FLYOUT_WIDTH
        : navState.state.flyout === "collapsed"
          ? STRIP_WIDTH
          : 0;
    document.documentElement.style.setProperty(
      "--nav-content-offset",
      `${currentWidth + flyoutExtra}px`
    );
  }, [currentWidth, navState.state.flyout]);

  useEffect(() => {
    if (navState.state.flyout === "closed") {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        navState.closeFlyout();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navState.closeFlyout, navState.state.flyout]);

  const handleResizeStart = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      isDragging.current = true;
      setDragWidth(expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH);

      const handleMouseMove = (moveEvent: MouseEvent): void => {
        if (!isDragging.current) {
          return;
        }
        const next = Math.min(
          EXPANDED_WIDTH,
          Math.max(COLLAPSED_WIDTH, moveEvent.clientX)
        );
        setDragWidth(next);
      };

      const handleMouseUp = (upEvent: MouseEvent): void => {
        isDragging.current = false;
        const finalX = Math.min(
          EXPANDED_WIDTH,
          Math.max(COLLAPSED_WIDTH, upEvent.clientX)
        );
        navState.setSidebar(finalX >= SNAP_THRESHOLD);
        setDragWidth(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [expanded, navState.setSidebar]
  );

  function isActive(id: string): boolean {
    if (id === "workflows") {
      return pathname === "/workflows" || pathname.startsWith("/workflows/");
    }
    if (id === "hub") {
      return pathname === "/hub" && searchParams.get("tab") !== "marketplace";
    }
    if (id === "marketplace") {
      return (
        pathname === "/marketplace" ||
        (pathname === "/hub" && searchParams.get("tab") === "marketplace")
      );
    }
    if (id === "analytics") {
      return pathname === "/analytics";
    }
    if (id === "earnings") {
      return pathname === "/earnings";
    }
    if (id === "activity") {
      return pathname === "/activity";
    }
    if (id === "settings") {
      return pathname.startsWith("/settings");
    }
    return false;
  }

  function requireSignIn(): boolean {
    if (!session?.user || isAnonymousUser(session.user)) {
      setAuthPromptOpen(true);
      return true;
    }
    return false;
  }

  async function handleNewWorkflow(): Promise<void> {
    if (isAnonymous) {
      if (!session) {
        await authClient.signIn.anonymous();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const existing = await api.workflow
        .getAll()
        .catch(() => [] as SavedWorkflow[]);
      const visible = visibleWorkflows(existing);
      if (visible.length > 0) {
        toast.info("Connect a wallet to create more workflows.");
        const latest = [...visible].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        router.push(`/workflows/${latest.id}`);
        return;
      }
    }
    const created = await api.workflow.create({
      name: "Untitled Workflow",
      description: "",
      nodes: [],
      edges: [],
    });
    await fetchData();
    navState.setFlyout("open");
    sessionStorage.setItem("animate-sidebar", "true");
    router.push(`/workflows/${created.id}`);
  }

  function handleNavClick(item: NavItemDef): void {
    if (item.requireAuth && requireSignIn()) {
      return;
    }
    if (item.id === "workflows") {
      navState.toggleFlyout();
      return;
    }
    if (item.id === "wallet") {
      openOverlay(WalletOverlay);
      return;
    }
    if (item.href) {
      router.push(item.href);
    }
    setMobileOpen(false);
  }

  const picker = visibleWorkflows(workflows);

  if (isPending || !navState.hasMounted) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-(--header-height) bottom-0 left-0 z-40 hidden bg-background md:flex"
        style={{ width: currentWidth }}
      />
    );
  }

  const body = (
    <SidebarBody
      currentWidth={isMobile ? EXPANDED_WIDTH : currentWidth}
      expanded={isMobile ? true : expanded}
      isActive={isActive}
      onNavClick={handleNavClick}
      onNewWorkflow={() => {
        handleNewWorkflow().catch(() => {
          router.push("/");
        });
      }}
      onToggle={() => navState.setSidebar(!expanded)}
      showLabels={isMobile ? true : showLabels}
    />
  );

  if (isMobile) {
    return (
      <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
        <SheetContent className="flex w-72 flex-col p-0" side="left">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {body}
          <div className="border-t p-2">
            <WorkflowPicker
              activeWorkflowId={workflowId}
              isAnonymous={isAnonymous}
              loading={dataLoading}
              workflows={picker}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <div
        className={cn(
          "pointer-events-auto fixed top-(--header-height) bottom-0 left-0 z-40 flex flex-col bg-background",
          dragWidth === null && "transition-[width] duration-200 ease-out"
        )}
        style={{ width: currentWidth }}
      >
        {body}
        <div
          aria-orientation="vertical"
          aria-valuenow={currentWidth}
          className="group absolute inset-y-0 right-0 z-10 w-3 cursor-col-resize"
          onMouseDown={handleResizeStart}
          role="separator"
          tabIndex={0}
        >
          <div className="absolute inset-y-0 right-0 w-px bg-border" />
        </div>
      </div>

      <FlyoutPanel
        collapsedLabel="Workflows"
        leftOffset={currentWidth}
        onCollapse={() => navState.setFlyout("collapsed")}
        onExpand={() => navState.setFlyout("open")}
        state={navState.state.flyout}
        title="Workflows"
      >
        <WorkflowPicker
          activeWorkflowId={workflowId}
          isAnonymous={isAnonymous}
          loading={dataLoading}
          workflows={picker}
        />
      </FlyoutPanel>

      {navState.state.flyout !== "closed" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="pointer-events-auto fixed top-[calc(var(--header-height)+8px)] z-40 rounded-md p-1.5 text-muted-foreground transition-[left,colors] duration-200 ease-out hover:bg-muted hover:text-foreground"
              onClick={navState.closeFlyout}
              style={{
                left:
                  currentWidth +
                  (navState.state.flyout === "open"
                    ? FLYOUT_WIDTH
                    : STRIP_WIDTH) +
                  4,
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Close menu</TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );
}
