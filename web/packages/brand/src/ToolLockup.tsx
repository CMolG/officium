import { ToolMark, type ToolMarkProps } from "./ToolMark";
import { ToolTag } from "./ToolTag";
import type { ToolKind } from "./tools";

/**
 * The mark and its name, the way a tool shows up in a catalog row, an API card, the Tiny Tool bar
 * and a link preview. The name is Montserrat 600 at about 62% of the mark (13 px at least): no Doto
 * wordmark and no colored dot, those belong to products. `kind` adds the tag; pass it where the
 * surroundings do not already say what the thing is.
 */
export function ToolLockup({
  name,
  kind,
  size = 24,
  dark = false,
  fontSize,
  ...mark
}: ToolMarkProps & { name: string; kind?: ToolKind; fontSize?: number }) {
  const fs = fontSize ?? Math.max(13, Math.round(size * 0.62));
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.4), minWidth: 0 }}>
      <ToolMark {...mark} size={size} dark={dark} />
      <span
        style={{
          fontFamily: "var(--font-jd-body, Montserrat, ui-sans-serif, system-ui, sans-serif)",
          fontSize: fs,
          fontWeight: 600,
          color: dark ? "#FFFFFF" : "#111111",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      {kind && <ToolTag kind={kind} dark={dark} size={Math.max(11, Math.round(fs * 0.7))} />}
    </span>
  );
}
