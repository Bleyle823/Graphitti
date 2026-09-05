type SidebarRefetch = (options?: { closeFlyout?: boolean }) => void;

let refetch: SidebarRefetch | null = null;

export function registerSidebarRefetch(fn: SidebarRefetch): () => void {
  refetch = fn;
  return () => {
    if (refetch === fn) {
      refetch = null;
    }
  };
}

export function refetchSidebar(options?: { closeFlyout?: boolean }): void {
  refetch?.(options);
}
