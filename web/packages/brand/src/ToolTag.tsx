import { TOOL_KIND_LABEL, type ToolKind } from "./tools";

/**
 * The kind of a tool, said in words: "API" or "Tiny tool", a neutral pill after the name. Said
 * wherever the context does not already say it (a list headed "APIs" can drop it); the shape of the
 * mark never says it.
 */
export function ToolTag({ kind, dark = false, size = 11 }: { kind: ToolKind; dark?: boolean; size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: Math.round(size * 1.9),
        padding: `0 ${Math.round(size * 0.7)}px`,
        borderRadius: 9999,
        background: dark ? "rgba(255,255,255,.14)" : "rgba(17,17,17,.07)",
        color: dark ? "#FFFFFF" : "#111111",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: ".02em",
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      {TOOL_KIND_LABEL[kind]}
    </span>
  );
}
