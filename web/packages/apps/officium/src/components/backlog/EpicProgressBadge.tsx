import { ListChecks } from "lucide-react";

import { checkpointsCompleted, type CheckpointProgress } from "../../lib/backlog/checkpoints";

/**
 * An epic's "N/M" on its board face (card://JAVA-1873, Off-Vocab): its checkpoints completed of its total, the
 * count its detail's Checkpoints section shows, served with the epic so the face never counts cards the board did
 * not load. Nothing for a card with no checkpoints. Icon and figures, never colour alone; the words are in the
 * tooltip, and the card's accessible name carries them too.
 */
export function EpicProgressBadge({ progress }: { progress?: CheckpointProgress | null }) {
  if (!progress?.total) return null;
  return (
    <span
      data-epic-progress
      title={checkpointsCompleted(progress)}
      className="inline-flex shrink-0 flex-row items-center gap-1 rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-card)] px-2 py-0.5 text-xs font-semibold tabular-nums text-[color:var(--jd-ink)]"
    >
      <ListChecks size={11} aria-hidden="true" />
      {progress.completed}/{progress.total}
    </span>
  );
}
