import type { ReactNode } from "react";

/** Local ships released: there is no release list. */
export function isAppReleased(_slug: string): boolean {
  return true;
}

export function ReleaseGate({ children }: { released: boolean; product: string; children: ReactNode }): ReactNode {
  return children;
}
