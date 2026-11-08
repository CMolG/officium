import type { ReactNode } from "react";

import { SHARE_PADDING } from "../spec";

/** The right-hand art box of an item card: 480 wide, centered in the padding. */
export function ItemArt({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        right: SHARE_PADDING,
        top: SHARE_PADDING,
        bottom: SHARE_PADDING,
        width: 480,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}
