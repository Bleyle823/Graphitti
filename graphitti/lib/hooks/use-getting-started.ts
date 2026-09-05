"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { isAnonymousUser } from "@/lib/is-anonymous";

const STORAGE_KEY = "graphitti_getting_started";

export type GettingStartedStepKey = "create" | "connect" | "run" | "list";

type StoredState = {
  dismissed: boolean;
  expanded: boolean;
};

export type GettingStartedProgress = {
  create: boolean;
  connect: boolean;
  run: boolean;
  list: boolean;
};

const DEFAULT_STORED: StoredState = {
  dismissed: false,
  expanded: true,
};

function readStored(): StoredState {
  if (typeof window === "undefined") {
    return DEFAULT_STORED;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_STORED;
    }
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      dismissed: Boolean(parsed.dismissed),
      expanded: parsed.expanded !== false,
    };
  } catch {
    return DEFAULT_STORED;
  }
}

function writeStored(next: StoredState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function useGettingStarted() {
  const { data: session, isPending } = useSession();
  const [stored, setStored] = useState<StoredState>(DEFAULT_STORED);
  const [progress, setProgress] = useState<GettingStartedProgress>({
    create: false,
    connect: false,
    run: false,
    list: false,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStored(readStored());
    setReady(true);
  }, []);

  const refetch = useCallback(async (): Promise<void> => {
    if (isPending || isAnonymousUser(session?.user)) {
      setProgress({
        create: false,
        connect: false,
        run: false,
        list: false,
      });
      return;
    }
    const [workflows, integrations, analytics] = await Promise.all([
      api.workflow.getAll().catch(() => []),
      api.integration.getAll().catch(() => []),
      api.analytics.summary().catch(() => null),
    ]);
    const visible = workflows.filter(
      (workflow) => workflow.name !== "__current__" && !workflow.deletedAt
    );
    setProgress({
      create: visible.length > 0,
      connect: integrations.length > 0,
      run: (analytics?.executions ?? 0) > 0,
      list: (analytics?.listed ?? 0) > 0,
    });
  }, [isPending, session?.user]);

  useEffect(() => {
    refetch().catch(() => {
      /* ignore */
    });
  }, [refetch]);

  const persist = useCallback((next: StoredState): void => {
    setStored(next);
    writeStored(next);
  }, []);

  const setExpanded = useCallback(
    (expanded: boolean): void => {
      persist({ ...stored, expanded });
    },
    [persist, stored]
  );

  const dismiss = useCallback((): void => {
    persist({ ...stored, dismissed: true, expanded: false });
  }, [persist, stored]);

  const reopen = useCallback((): void => {
    persist({ dismissed: false, expanded: true });
  }, [persist]);

  const done =
    Number(progress.create) +
    Number(progress.connect) +
    Number(progress.run) +
    Number(progress.list);

  return {
    ready,
    dismissed: stored.dismissed,
    expanded: stored.expanded,
    progress,
    done,
    total: 4,
    setExpanded,
    dismiss,
    reopen,
    refetch,
  };
}
