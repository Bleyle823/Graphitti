"use client";

import type { ReactNode } from "react";

type SaveAddressBookmarkProps = {
  children: ReactNode;
  fieldKey?: string;
  nodeId?: string;
  selectedBookmarkId?: string;
  address?: string;
};

/** Graphitti stub: address book UI is not wired yet; passthrough wrapper. */
export function SaveAddressBookmark({ children }: SaveAddressBookmarkProps) {
  return <>{children}</>;
}
