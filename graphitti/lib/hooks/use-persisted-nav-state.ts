"use client";

import { useCallback, useEffect, useState } from "react";

export const COLLAPSED_WIDTH = 60;
export const EXPANDED_WIDTH = 200;
const SIDEBAR_COOKIE = "graphitti_nav_sidebar";
const FLYOUT_COOKIE = "graphitti_nav_flyout";

export type FlyoutState = "closed" | "open" | "collapsed";

type NavState = {
  sidebar: boolean;
  flyout: FlyoutState;
};

const DEFAULT_STATE: NavState = {
  sidebar: true,
  flyout: "closed",
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
}

function writeCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export function usePersistedNavState() {
  const [hasMounted, setHasMounted] = useState(false);
  const [state, setState] = useState<NavState>(DEFAULT_STATE);

  useEffect(() => {
    const sidebarRaw = readCookie(SIDEBAR_COOKIE);
    const flyoutRaw = readCookie(FLYOUT_COOKIE);
    const sidebar = sidebarRaw === "0" ? false : true;
    const flyout: FlyoutState =
      flyoutRaw === "open" || flyoutRaw === "collapsed" ? flyoutRaw : "closed";
    setState({ sidebar, flyout });
    setHasMounted(true);
  }, []);

  const setSidebar = useCallback((expanded: boolean): void => {
    setState((prev) => {
      writeCookie(SIDEBAR_COOKIE, expanded ? "1" : "0");
      writeCookie("graphitti_nav_sidebar_w", expanded ? "200" : "60");
      return { ...prev, sidebar: expanded };
    });
  }, []);

  const setFlyout = useCallback((flyout: FlyoutState): void => {
    setState((prev) => {
      writeCookie(FLYOUT_COOKIE, flyout);
      return { ...prev, flyout };
    });
  }, []);

  const toggleFlyout = useCallback((): void => {
    setState((prev) => {
      const next: FlyoutState = prev.flyout === "closed" ? "open" : "closed";
      writeCookie(FLYOUT_COOKIE, next);
      return { ...prev, flyout: next };
    });
  }, []);

  const closeFlyout = useCallback((): void => {
    setFlyout("closed");
  }, [setFlyout]);

  return {
    hasMounted,
    state,
    setSidebar,
    setFlyout,
    toggleFlyout,
    closeFlyout,
  };
}
