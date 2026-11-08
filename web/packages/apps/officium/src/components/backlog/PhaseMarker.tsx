import { Text } from "@javadaba/ui";

import { PHASE_LABEL, PHASE_STATUS } from "../../lib/backlog/role-config";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { Phase } from "../../lib/backlog/role-matrix-types";
import { StatusShape } from "./StatusShape";

/**
 * A matrix cell's phase, drawn the way the board draws its column (JAVA-1776): the status's polygon and name on the
 * status's own tint. Text, not a control: nothing about it is pressable.
 */
export function PhaseMarker({ phase }: { phase: Phase }) {
  const status = PHASE_STATUS[phase];
  const { tone } = STATUS_CONFIG[status];
  return (
    <span
      data-testid="phase-marker"
      data-phase={phase}
      data-status={status}
      className="inline-flex max-w-full flex-row items-center gap-1.5 rounded-[var(--radius-jd-sm)] border px-2 py-0.5"
      style={{ background: tone.fill, color: tone.ink, borderColor: tone.line }}
    >
      <StatusShape status={status} className="size-4 shrink-0" />
      <Text className="min-w-0 text-xs font-bold">{PHASE_LABEL[phase]}</Text>
    </span>
  );
}
