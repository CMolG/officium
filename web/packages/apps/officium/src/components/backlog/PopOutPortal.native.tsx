import type { ReactNode } from "react";

import type { PoppedOut } from "../../lib/shell/pop-out";

/** Android: there is no other window to draw in. */
export function PopOutPortal(_props: { popped: PoppedOut; children: ReactNode }) {
  return null;
}
