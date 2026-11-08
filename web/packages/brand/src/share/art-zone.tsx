import type { ReactNode } from "react";

export function ArtZone({ square, children }: { square: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 40,
        right: 40,
        bottom: 0,
        height: square ? 300 : 190,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}
