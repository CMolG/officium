import type { CSSProperties } from "react";

import { ShareMark } from "./mark";

/** Where the mark goes: top right on light, bottom right on dark, 110 px bottom left on items. */
export function MarkSlot({ place, width, black }: { place: "tr" | "br" | "bl"; width: number; black?: string }) {
  const at: CSSProperties =
    place === "tr" ? { right: 56, top: 72 } : place === "br" ? { right: 56, bottom: 52 } : { left: 56, bottom: 56 };
  return (
    <div style={{ display: "flex", position: "absolute", lineHeight: 0, ...at }}>
      <ShareMark width={width} black={black} />
    </div>
  );
}
