"use client";

import { Progress, Text } from "@javadaba/ui";
import { ListOrdered } from "lucide-react";

import type { CardDetail } from "../../lib/backlog/types";
import { CheckpointRow } from "./CheckpointRow";
import { SectionHeading } from "./SectionHeading";

/**
 * An epic's checkpoints (card://JAVA-1873, epic JAVA-1868): its cards in the order they are built, each with its
 * state, and how far the epic has come. Every card stays where it is on the board; this is the epic's view of them,
 * the one an agent working the whole epic in one session follows. Only on an epic that has cards.
 */
export function CheckpointsSection({ detail, onOpenOther }: { detail: CardDetail; onOpenOther: (cardId: string) => void }) {
  const checkpoints = detail.checkpoints ?? [];
  if (checkpoints.length === 0) return null;
  const progress = detail.checkpointProgress ?? { completed: checkpoints.filter((c) => c.state === "completed").length, total: checkpoints.length };
  const summary = `${progress.completed} of ${progress.total} completed`;
  return (
    <section aria-label="Checkpoints" data-testid="checkpoints-section" className="flex flex-col gap-3">
      <SectionHeading icon={<ListOrdered size={16} />}>Checkpoints · {progress.total}</SectionHeading>
      <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
        This epic's cards in the order they are built. A card that waits on another comes after it, and the test run is
        last. A checkpoint is completed once its card is built; review and release follow.
      </Text>
      <div className="flex flex-col gap-1">
        <Progress value={progress.completed} max={progress.total} aria-label="Checkpoints completed" aria-valuetext={summary} />
        <Text className="text-xs text-[color:var(--jd-muted)]" data-testid="checkpoints-summary">
          {summary}
        </Text>
      </div>
      <ol className="flex flex-col gap-2">
        {checkpoints.map((checkpoint, index) => (
          <CheckpointRow key={checkpoint.id} checkpoint={checkpoint} position={index + 1} onOpen={onOpenOther} />
        ))}
      </ol>
    </section>
  );
}
