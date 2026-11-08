import type { ReactNode } from "react";

import { SHARE_PADDING } from "../spec";

/** The tile (104 px) and the wordmark, at the card's top left. */
export function Header({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: SHARE_PADDING,
        top: 44,
        flexDirection: "row",
        alignItems: "center",
        columnGap: 30,
      }}
    >
      {children}
    </div>
  );
}
