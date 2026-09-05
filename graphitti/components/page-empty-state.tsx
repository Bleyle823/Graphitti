"use client";

import { useSetAtom } from "jotai";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { authPromptOpenAtom } from "@/lib/ui-store";

type PageEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: PageEmptyStateProps): React.ReactElement {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
        <p className="max-w-sm text-muted-foreground text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function SignInGate({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}): React.ReactElement {
  const setAuthOpen = useSetAtom(authPromptOpenAtom);

  return (
    <PageEmptyState
      action={<Button onClick={() => setAuthOpen(true)}>Sign in</Button>}
      description={description}
      icon={icon}
      title={title}
    />
  );
}
