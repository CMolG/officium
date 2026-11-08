import { KIND_INK, KINDS } from "./kinds";
import type { NodeKind } from "../../lib/system-design/types";

/** The kind's icon on its tint (Doc-Systema: 32 px, 9 px radius). Decorative: the kind is also said in words beside it. */
export function KindChip({ kind, size = 32 }: { kind: NodeKind; size?: number }) {
  const { icon: Icon, tint } = KINDS[kind];
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 flex-row items-center justify-center rounded-[9px]"
      style={{ width: size, height: size, background: tint, color: KIND_INK }}
    >
      <Icon size={Math.round(size / 2)} />
    </span>
  );
}
