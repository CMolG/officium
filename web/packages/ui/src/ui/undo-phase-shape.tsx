import { Glyph } from "./glyph";
import { Spinner } from "./spinner";
import type { UndoPhase } from "./use-undo-notice";

/** A shape per phase, so the state reads without the color: a turning arc, a tick, a cross. Offered has none. */
export function UndoPhaseShape({ phase }: { phase: UndoPhase | undefined }) {
  if (phase === "undoing") return <Spinner />;
  if (phase === "undone") return <Glyph name="check-circle" className="text-[color:var(--jd-ok)]" />;
  if (phase === "failed") return <Glyph name="x-circle" className="text-[color:var(--jd-bad)]" />;
  return null;
}
