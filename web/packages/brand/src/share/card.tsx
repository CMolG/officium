import type { ReactNode } from "react";

export function Card({
  square,
  background = "#FFFFFF",
  color = "#111111",
  children,
}: {
  square: boolean;
  background?: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: 1200,
        height: square ? 1200 : 630,
        overflow: "hidden",
        background,
        color,
        fontFamily: "Montserrat",
      }}
    >
      {children}
    </div>
  );
}
