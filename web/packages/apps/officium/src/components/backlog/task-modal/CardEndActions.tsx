"use client";

import { useId, useState } from "react";
import { Ban, Trash2 } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { useReadOnly } from "../../../lib/backlog/read-only-context";
import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { CardDetail } from "../../../lib/backlog/types";
import { DeleteCardDialog } from "./DeleteCardDialog";
import { RejectCardDialog } from "./RejectCardDialog";
import type { OnChanged, ReportConflict } from "./types";
import { useRejectionMeta } from "./use-rejection-meta";

export interface CardEndActionsProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  /** An epic's children that are neither done nor rejected. */
  openChildren: number;
  onChanged: OnChanged;
  /** The card is gone: the dialog closes, the page goes back to the board. */
  onDeleted: () => void;
  reportConflict: ReportConflict;
}

/** Why a card cannot be rejected now, in the words the disabled action shows; null when it can. */
function refusal(detail: CardDetail, openChildren: number): string | null {
  if (detail.status === "done") return "A completed card shipped: undo it with a new card.";
  if (detail.category === "epic" && openChildren > 0) {
    return `Finish or reject its ${openChildren} open ${openChildren === 1 ? "child" : "children"} first.`;
  }
  return null;
}

/**
 * How a card ends, both ways (card://JAVA-1415, Off-Card 2): Reject, a control of its own rather than an option of
 * the status picker because a rejection carries a reason, and Delete, which asks first and offers Reject instead
 * wherever rejecting is possible. Reject is hidden while the deployment does not accept rejections and on a
 * card already rejected, whose banner offers to reopen it; a viewer is offered neither.
 */
export function CardEndActions({ projectId, repository, detail, openChildren, onChanged, onDeleted, reportConflict }: CardEndActionsProps) {
  const meta = useRejectionMeta(repository);
  const readOnly = useReadOnly();
  const [dialog, setDialog] = useState<"reject" | "delete" | null>(null);
  const reasonId = useId();
  if (readOnly) return null;
  const canReject = Boolean(meta?.enabled) && detail.status !== "rejected";
  const refused = refusal(detail, openChildren);
  return (
    <>
      {canReject && (
        <Button type="button" register="ui" size="sm" variant="ghost" data-testid="reject-card" disabled={refused !== null}
          aria-describedby={refused ? reasonId : undefined} onClick={() => setDialog("reject")} className="max-sm:min-h-11">
          <Ban size={16} aria-hidden="true" />
          <Text>Reject…</Text>
        </Button>
      )}
      {canReject && refused && <Text id={reasonId} className="text-xs text-[color:var(--jd-muted)]">{refused}</Text>}
      <Button type="button" register="ui" size="sm" variant="ghost" data-testid="delete-card" onClick={() => setDialog("delete")} className="max-sm:min-h-11">
        <Trash2 size={16} aria-hidden="true" />
        <Text>Delete…</Text>
      </Button>
      {dialog === "reject" && meta && (
        <RejectCardDialog projectId={projectId} repository={repository} detail={detail} reasons={meta.reasons}
          onChanged={onChanged} onClose={() => setDialog(null)} />
      )}
      {dialog === "delete" && (
        <DeleteCardDialog
          projectId={projectId}
          repository={repository}
          detail={detail}
          onRejectInstead={canReject && refused === null ? () => setDialog("reject") : undefined}
          onDeleted={onDeleted}
          onClose={() => setDialog(null)}
          reportConflict={reportConflict}
        />
      )}
    </>
  );
}
