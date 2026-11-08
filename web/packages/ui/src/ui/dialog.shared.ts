import type { ReactNode } from "react";

/** The root props of `Dialog` that both runtimes honour; the web's Radix root takes more (`modal`, a portal container). */
export interface DialogRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accepted so a web call site moves over; a native `Modal` is always modal. */
  modal?: boolean;
  /** The history entry a dialog owns on the web (JAVA-1417); Android has Back instead. */
  address?: { path: string; under: string };
  children?: ReactNode;
}
