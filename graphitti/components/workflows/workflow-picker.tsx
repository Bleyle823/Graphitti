"use client";

import { Copy, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmOverlay } from "@/components/overlays/confirm-overlay";
import { useOverlay } from "@/components/overlays/overlay-provider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip";
import type { SavedWorkflow } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { refetchSidebar } from "@/lib/refetch-sidebar";
import { cn } from "@/lib/utils";

type WorkflowPickerProps = {
  workflows: SavedWorkflow[];
  activeWorkflowId: string | undefined;
  loading: boolean;
  isAnonymous: boolean;
};

export function WorkflowPicker({
  workflows,
  activeWorkflowId,
  loading,
  isAnonymous,
}: WorkflowPickerProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return workflows;
    }
    return workflows.filter((workflow) =>
      workflow.name.toLowerCase().includes(needle)
    );
  }, [query, workflows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground text-sm">
        {isAnonymous ? "Sign in to save workflows" : "No workflows yet"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Search workflows"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workflows"
        value={query}
      />
      {filtered.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-sm">
          No workflows match that search.
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {filtered.map((workflow) => (
            <WorkflowRow
              isActive={workflow.id === activeWorkflowId}
              key={workflow.id}
              onRename={() => setRenamingId(workflow.id)}
              onRenameDone={() => setRenamingId(null)}
              renaming={renamingId === workflow.id}
              workflow={workflow}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowRow({
  workflow,
  isActive,
  renaming,
  onRename,
  onRenameDone,
}: {
  workflow: SavedWorkflow;
  isActive: boolean;
  renaming: boolean;
  onRename: () => void;
  onRenameDone: () => void;
}): React.ReactElement {
  const router = useRouter();
  const { open } = useOverlay();
  const [draft, setDraft] = useState(workflow.name);

  const openWorkflow = (): void => {
    router.push(`/workflows/${workflow.id}`);
  };

  const saveName = async (): Promise<void> => {
    const next = draft.trim();
    onRenameDone();
    if (!next || next === workflow.name) {
      setDraft(workflow.name);
      return;
    }
    try {
      await api.workflow.update(workflow.id, { name: next });
      refetchSidebar();
    } catch {
      toast.error("Could not rename workflow");
      setDraft(workflow.name);
    }
  };

  const duplicate = async (): Promise<void> => {
    try {
      const copy = await api.workflow.duplicate(workflow.id);
      refetchSidebar();
      router.push(`/workflows/${copy.id}`);
    } catch {
      toast.error("Could not duplicate workflow");
    }
  };

  const remove = (): void => {
    open(ConfirmOverlay, {
      title: "Delete workflow",
      message: `Delete "${workflow.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await api.workflow.delete(workflow.id);
          refetchSidebar();
          if (isActive) {
            router.push("/");
          }
        } catch {
          toast.error("Could not delete workflow");
        }
      },
    });
  };

  const rowClass = cn(
    "flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm transition-colors hover:bg-muted",
    isActive && "bg-muted"
  );

  if (renaming) {
    return (
      <div className={rowClass}>
        <Input
          autoFocus
          className="h-7"
          onBlur={() => {
            saveName().catch(() => {
              /* ignore */
            });
          }}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              saveName().catch(() => {
                /* ignore */
              });
            }
            if (event.key === "Escape") {
              setDraft(workflow.name);
              onRenameDone();
            }
          }}
          value={draft}
        />
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={rowClass}>
          <button
            className="flex min-w-0 flex-1 items-center justify-between px-1 py-1"
            onClick={openWorkflow}
            type="button"
          >
            <TruncatedTooltip side="right" text={workflow.name} />
            {workflow.isListed ? (
              <span className="ml-2 shrink-0 text-muted-foreground text-xs">
                Listed
              </span>
            ) : null}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Actions for ${workflow.name}`}
                className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                type="button"
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={onRename}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={duplicate}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={remove}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-40">
        <ContextMenuItem onSelect={onRename}>
          <Pencil className="size-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onSelect={duplicate}>
          <Copy className="size-4" />
          Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onSelect={remove}>
          <Trash2 className="size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
