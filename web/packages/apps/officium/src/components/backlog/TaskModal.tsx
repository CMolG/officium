"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Dialog, DialogContent, DialogDescription } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { AgentWork, Assignee, Card, CardDetail } from "../../lib/backlog/types";
import { CardPanel } from "./CardPanel";
import { useCardPanel } from "./task-modal/use-card-panel";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { ConflictInfo } from "./ConflictDialog";

export interface TaskModalProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  allCards: Omit<Card, "description" | "actionPlan">[];
  projectAssignees: Assignee[];
  /** The live session when an agent is actively working on this card (officium-api.md §4.1). */
  agentWork?: AgentWork;
  onClose: () => void;
  onOpenOther: (cardId: string) => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  /** JDB-226: a 409 opens the shared `ConflictDialog` (owned by `Board`) instead of a bare error
   *  string -- "never overwrite silently." Optional so this component still degrades to a plain
   *  error message if ever used without a conflict-aware parent. */
  onConflict?: (info: ConflictInfo) => void;
}

/**
 * The card's full view in a dialog (`CardPanel` is the view itself, JAVA-1567): its two texts (description and action plan), time log, attachments,
 * related cards, comments, and a sidebar with who does it, priority, assignees and history.
 * Ported from `../officium-concept/src/components/backlog/TaskModal.tsx` on `@javadaba/ui`'s
 * `Dialog` (Radix): focus trap, `Escape`, and focus return to the trigger all come from the
 * primitive (JDB-224 item 3). Comments render keyed by `comment.id` (JDB-224 item 2).
 *
 * Every text on a card is Markdown, written by people here and by agents over MCP, so every text
 * is READ formatted and EDITED with the ecosystem's rich-text engine (`@javadaba/rich-text`,
 * Fabula's editor and controls, user decision 2026-09-23). The editor only hands back a new text
 * for what the person actually changed -- saving an untouched field sends nothing, and the API
 * does not count it as an edit.
 */
export function TaskModal({ projectId, repository, detail, allCards, projectAssignees, agentWork, onClose, onOpenOther, onChanged, onConflict }: TaskModalProps) {
  const returnFocus = useReturnFocus();
  const panel = useCardPanel({ projectId, repository, detail, allCards, onChanged, onConflict });
  const { guardUnsaved, onInteractOutside } = panel.text;

  // The dialog keeps the route: opening a card here never moves the address (JAVA-1567); the
  // header's link is the way to the card's own page.
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        onEscapeKeyDown={guardUnsaved}
        onInteractOutside={onInteractOutside}
        // Its header draws its own close, at every width (JAVA-224: 44 px on a phone, below).
        sheetClose={false}
        // The body below scrolls itself, so the box clips; its height (and the full-screen sheet
        // on a phone) comes from `DialogContent`.
        className="flex w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:rounded-[var(--radius-jd-xl)]"
      >
        <DialogDescription className="sr-only">Card details for {detail.key}</DialogDescription>
        <CardPanel
          projectId={projectId}
          repository={repository}
          detail={detail}
          panel={panel}
          projectAssignees={projectAssignees}
          agentWork={agentWork}
          surface="dialog"
          onOpenOther={onOpenOther}
          onChanged={onChanged}
          onDeleted={onClose}
          onConflict={onConflict}
        />
      </DialogContent>
    </Dialog>
  );
}
