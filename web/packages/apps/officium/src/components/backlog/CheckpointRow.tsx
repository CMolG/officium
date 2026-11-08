"use client";

import { Badge, Text } from "@javadaba/ui";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import type { Checkpoint, CheckpointState } from "../../lib/backlog/checkpoints";

const STATE: Record<CheckpointState, { label: string; tone: "neutral" | "info" | "success"; icon: typeof Circle }> = {
  pending: { label: "Pending", tone: "neutral", icon: Circle },
  in_progress: { label: "In progress", tone: "info", icon: CircleDot },
  completed: { label: "Completed", tone: "success", icon: CheckCircle2 },
};

/** What sets a checkpoint apart from a plain one, in words, so no state rests on color alone. */
function notesOf(checkpoint: Checkpoint): string[] {
  const notes: string[] = [];
  if (checkpoint.verification) notes.push("Test run");
  if (!checkpoint.planned) notes.push("Not planned yet");
  if (checkpoint.executor === "human") notes.push("A person's");
  if (checkpoint.category === "spike") notes.push("Research");
  if (checkpoint.state !== "completed" && !checkpoint.ready) notes.push("Blocked");
  return notes;
}

/** One checkpoint of an epic: its place, its state in words and icon, and the card it is, which opens on click. */
export function CheckpointRow({ checkpoint, position, onOpen }: { checkpoint: Checkpoint; position: number; onOpen: (cardId: string) => void }) {
  const state = STATE[checkpoint.state];
  const Icon = state.icon;
  const current = checkpoint.state === "in_progress";
  return (
    <li
      aria-current={current ? "step" : undefined}
      data-testid="checkpoint"
      data-state={checkpoint.state}
      className={`flex flex-row flex-wrap items-center gap-2 rounded-[var(--radius-jd-md)] border px-3 py-1 ${current ? "border-[color:var(--jd-ink)]" : "border-[color:var(--jd-line)]"}`}
    >
      <Text className="w-6 shrink-0 text-right font-mono text-xs text-[color:var(--jd-muted)]">{position}</Text>
      <Badge register="tag" size="xs" tone={state.tone}>
        <Icon size={12} aria-hidden="true" />
        <Text>{state.label}</Text>
      </Badge>
      <button
        type="button"
        onClick={() => onOpen(checkpoint.id)}
        className="flex min-h-11 min-w-0 flex-1 basis-48 flex-row items-center gap-2 py-1 text-left hover:underline active:opacity-70"
      >
        <Text className="shrink-0 font-mono text-xs text-[color:var(--jd-muted)]">{checkpoint.key}</Text>
        {/* The title wraps rather than cut: on a phone it is what tells the checkpoints apart. */}
        <Text className="min-w-0 text-sm [overflow-wrap:anywhere]">{checkpoint.title}</Text>
      </button>
      {notesOf(checkpoint).map((note) => (
        <Badge key={note} register="tag" size="xs">
          <Text>{note}</Text>
        </Badge>
      ))}
    </li>
  );
}
