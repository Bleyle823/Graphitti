import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function PageShell({
  title,
  description,
  actions,
  children,
}: PageShellProps): React.ReactElement {
  return (
    <div className="pointer-events-auto min-h-dvh bg-background pt-(--header-height) transition-[margin-left] duration-200 ease-out md:ml-(--nav-content-offset,var(--nav-sidebar-width,200px))">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-1 text-muted-foreground text-sm">
                {description}
              </p>
            ) : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </div>
  );
}
