"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { Button, Note, SaveStatus } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { AgentWork, Assignee, CardDetail } from "../../lib/backlog/types";
import { cardPath } from "../../lib/backlog/search-links";
import { useCardPip } from "../../lib/shell/use-card-pip";
import { CardMain } from "./task-modal/CardMain";
import { CardEndActions } from "./task-modal/CardEndActions";
import { RejectionBanner } from "./task-modal/RejectionBanner";
import { TaskModalDialogs } from "./task-modal/TaskModalDialogs";
import { TaskModalHeader } from "./task-modal/TaskModalHeader";
import { TaskModalSidebar } from "./task-modal/TaskModalSidebar";
import type { CardPanelState } from "./task-modal/use-card-panel";
import type { ConflictInfo } from "./ConflictDialog";

export interface CardPanelProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  panel: CardPanelState;
  projectAssignees: Assignee[];
  /** The live session when an agent is actively working on this card (officium-api.md §4.1). */
  agentWork?: AgentWork;
  /** `dialog` sits inside a `Dialog` (title and close are the dialog's); `page` is the card's own page. */
  surface: "dialog" | "page";
  onOpenOther: (cardId: string) => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  /** The card was deleted from here: close the dialog, or leave the page for the board. */
  onDeleted?: () => void;
  onConflict?: (info: ConflictInfo) => void;
}

/**
 * A card's whole view: header, its two texts, time log, attachments, related cards, comments and
 * the sidebar. It needs no `Dialog`, so the modal and the card's own page (JAVA-1567) render the
 * same thing from the same hooks (`useCardPanel`, called by whoever mounts this).
 */
export function CardPanel({ projectId, repository, detail, panel, projectAssignees, agentWork, surface, onOpenOther, onChanged, onDeleted, onConflict }: CardPanelProps) {
  const { accountId, writes, text, comments, signals, sprints, sprint, linkable, timeTrackingOpen, setTimeTrackingOpen } = panel;
  const { error, setError, reportConflict, changeStatus } = writes;
  // The Host's Picture in picture follows the open card (MIG-F06).
  useCardPip(detail, agentWork);
  const { isEditing, titleDraft, setTitleDraft, titleBlank, saving, startEditing, cancelEditing, saveEdits, unsavedNotice } = text;

  // JAVA-292: an epic is worked through its children, and one with none can only be refined.
  const isEpic = detail.category === "epic";
  const childlessEpic = isEpic && detail.epicChildren === 0;
  // JAVA-379: one with children sits where they put it, and a person moves it only once every child
  // is done, between Review, Deploy and Completed.
  const epicChildren = isEpic ? (detail.epicChildren ?? 0) : 0;
  const openChildren = detail.epicChildrenOpen ?? 0;
  const followsChildren = epicChildren > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TaskModalHeader
        detail={detail}
        surface={surface}
        pagePath={cardPath(projectId, detail.key)}
        isEditing={isEditing}
        titleDraft={titleDraft}
        setTitleDraft={setTitleDraft}
        titleBlank={titleBlank}
        saving={saving}
        startEditing={startEditing}
        cancelEditing={cancelEditing}
        saveEdits={saveEdits}
        childlessEpic={childlessEpic}
        followsChildren={followsChildren}
        epicChildren={epicChildren}
        openChildren={openChildren}
        changeStatus={changeStatus}
        statusAction={
          <CardEndActions
            projectId={projectId}
            repository={repository}
            detail={detail}
            openChildren={openChildren}
            onChanged={onChanged}
            onDeleted={() => onDeleted?.()}
            reportConflict={reportConflict}
          />
        }
      />
      <RejectionBanner detail={detail} changeStatus={changeStatus} />
      {unsavedNotice && (
        <div role="alert" className="flex flex-row shrink-0 flex-wrap items-center gap-3 bg-[color:var(--jd-warn-bg)] px-5 py-2 text-sm font-medium">
          {/* Where the card's saving stands, in words (SaveStatus): unsaved until Save, then Saving. */}
          <SaveStatus status={saving ? "saving" : "pending"} labels={{ pending: "You have unsaved changes on this card." }} />
          <span className="ml-auto flex flex-row gap-2">
            <Button type="button" register="ui" size="sm" variant="ghost" onClick={cancelEditing}>
              Discard them
            </Button>
            <Button type="button" register="ui" size="sm" disabled={titleBlank || saving} onClick={() => void saveEdits()}>
              Save
            </Button>
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="shrink-0 px-5 py-2">
          <Note tone="danger" role="presentation">
            <span className="font-medium">{error}</span>
          </Note>
        </div>
      )}

      <div data-testid="card-body" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 md:flex-row">
        <CardMain
          projectId={projectId}
          repository={repository}
          detail={detail}
          agentWork={agentWork}
          accountId={accountId}
          linkable={linkable}
          text={text}
          comments={comments}
          onChanged={onChanged}
          onOpenOther={onOpenOther}
          reportConflict={reportConflict}
          setError={setError}
        />

        <TaskModalSidebar
          projectId={projectId}
          repository={repository}
          detail={detail}
          isEpic={isEpic}
          writes={writes}
          signals={signals}
          sprints={sprints}
          sprint={sprint}
          setTimeTrackingOpen={setTimeTrackingOpen}
          cards={linkable}
        />
      </div>

      <TaskModalDialogs
        projectId={projectId}
        repository={repository}
        detail={detail}
        projectAssignees={projectAssignees}
        writes={writes}
        signals={signals}
        timeTrackingOpen={timeTrackingOpen}
        setTimeTrackingOpen={setTimeTrackingOpen}
        onChanged={onChanged}
        onConflict={onConflict}
      />
    </div>
  );
}
