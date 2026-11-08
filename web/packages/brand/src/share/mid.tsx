import type { ReactNode } from "react";

export function Mid({ top, gap, children }: { top: number; gap: number; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 100,
        right: 100,
        top,
        flexDirection: "column",
        alignItems: "center",
        rowGap: gap,
      }}
    >
      {children}
    </div>
  );
}
