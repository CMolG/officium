import type { ReactNode } from "react";

/** `DialogPortal` exists so the name matches the web's: a native `Modal` is its own window, with nothing to portal to. */
export function DialogPortal({ children }: { children?: ReactNode; container?: unknown }) {
  return <>{children}</>;
}
