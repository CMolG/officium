"use client";

import { Check, Pencil, Play, Trash } from "lucide-react";

import { Button } from "@javadaba/ui";

import type { Sprint } from "../../lib/backlog/types";

/** A sprint block's header actions: Start, Complete, Edit and Delete, each only where the sprint's state allows it. */
export function SprintActions({
  sprint,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  startDisabledReason,
}: {
  sprint: Sprint;
  onStart?: () => void;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  startDisabledReason?: string | null;
}) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      {sprint.state === "planned" && onStart && (
        <Button
          type="button" register="ui" variant="outline" size="sm"
          disabled={Boolean(startDisabledReason)}
          title={startDisabledReason ?? undefined}
          onClick={onStart}
        >
          <Play size={13} /> Start
        </Button>
      )}
      {sprint.state === "active" && onComplete && (
        <Button type="button" register="ui" variant="outline" size="sm" onClick={onComplete}>
          <Check size={13} /> Complete
        </Button>
      )}
      {onEdit && (
        <Button type="button" register="ui" variant="ghost" size="sm" aria-label={`Edit ${sprint.name}`} onClick={onEdit}>
          <Pencil size={13} />
        </Button>
      )}
      {sprint.state === "planned" && onDelete && (
        <Button type="button" register="ui" variant="ghost" size="sm" aria-label={`Delete ${sprint.name}`} onClick={onDelete}>
          <Trash size={13} />
        </Button>
      )}
    </div>
  );
}
