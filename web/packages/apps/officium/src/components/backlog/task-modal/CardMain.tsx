"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { AlignLeft, ListChecks } from "lucide-react";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import type { AgentWork, Card, CardDetail } from "../../../lib/backlog/types";
import { useCurrentAccountId } from "../../../lib/backlog/use-current-account";
import { AgentStatusSection } from "../AgentStatusSection";
import { AttachmentsSection } from "../AttachmentsSection";
import { CardFormSection } from "../CardFormSection";
import { CheckpointsSection } from "../CheckpointsSection";
import { DevelopmentSection } from "../DevelopmentSection";
import { LinksSection } from "../LinksSection";
import { QualityLineageSection } from "../QualityLineageSection";
import { SentBackSection } from "../SentBackSection";
import { WaitingForYouSection } from "../WaitingForYouSection";
import { CommentsSection } from "./CommentsSection";
import { TextSection } from "./TextSection";
import { RefineSlots } from "./RefineSlots";
import type { OnChanged, ReportConflict } from "./types";
import type { CardComments } from "./use-card-comments";
import { showsRefineSlots } from "../../../lib/backlog/refine-slots";

/** A Refine card's plan opens with its Base line, then its refine role's line (JAVA-1592). */
const REFINE_PLAN_EMPTY = "No plan yet. Write the Base line first, then the Role line of the workflow's refine role.";
const REFINE_PLAN_PLACEHOLDER = "Base: control branch\nRole: …\n\nHow will this be tackled? Steps, checks, risks…";
import type { CardTextEditing } from "./use-card-text-editing";

export interface CardMainProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  agentWork?: AgentWork;
  accountId: ReturnType<typeof useCurrentAccountId>;
  linkable: Omit<Card, "description" | "actionPlan">[];
  text: CardTextEditing;
  comments: CardComments;
  onChanged: OnChanged;
  onOpenOther: (cardId: string) => void;
  reportConflict: ReportConflict;
  setError: (message: string | null) => void;
}

/** The main column: the card's texts, attachments, links and comments. */
export function CardMain({ projectId, repository, detail, agentWork, accountId, linkable, text, comments, onChanged, onOpenOther, reportConflict, setError }: CardMainProps) {
  const { isEditing, focusField, startEditing, setTextDrafts, saveEdits } = text;
  // The scroll ends with air under the comment box (user report, 2026-09-23: it was
  // pressed against the dialog's edge). The cause was not a small margin: in the row
  // layout this column STRETCHED to the scroller's height, its content overflowed it,
  // and any bottom padding sat at the stretched edge instead of after the content.
  // `md:self-start` lets the column be as tall as what it holds, padding included.
  const planSection = (
    <TextSection
      title="Action plan"
      icon={<ListChecks size={16} />}
      markdown={detail.actionPlan ?? ""}
      editing={isEditing}
      editorKey="actionPlan"
      autoFocus={focusField === "actionPlan"}
      empty={showsRefineSlots(detail) ? REFINE_PLAN_EMPTY : "No plan yet. Whoever picks this card up, a person or an agent, writes here how it will be done."}
      startLabel="Write the plan"
      placeholder={showsRefineSlots(detail) ? REFINE_PLAN_PLACEHOLDER : "How will this be tackled? Steps, checks, risks…"}
      hosted={showsRefineSlots(detail)}
      onStart={() => startEditing("actionPlan")}
      onChange={(change) => setTextDrafts((d) => ({ ...d, actionPlan: change }))}
      onSubmit={() => void saveEdits()}
    />
  );
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 pb-6 md:self-start md:pb-10" data-testid="card-main">
      {agentWork && <AgentStatusSection work={agentWork} />}
      <WaitingForYouSection projectId={projectId} repository={repository} cardId={detail.id} />

      {/* A human card's form is its primary action, so it sits above the card's own texts. */}
      <CardFormSection projectId={projectId} repository={repository} detail={detail} accountId={accountId} onChanged={onChanged} />

      <TextSection
        title="Description"
        icon={<AlignLeft size={16} />}
        markdown={detail.description ?? ""}
        editing={isEditing}
        editorKey="description"
        autoFocus={focusField === "description"}
        empty="No description yet."
        startLabel="Add a description"
        placeholder="What is this card about, and why does it matter?"
        onStart={() => startEditing("description")}
        onChange={(change) => setTextDrafts((d) => ({ ...d, description: change }))}
        onSubmit={() => void saveEdits()}
      />

      {showsRefineSlots(detail) ? (
        <RefineSlots projectId={projectId} repository={repository} card={detail} plan={planSection} />
      ) : (
        planSection
      )}

      <CheckpointsSection detail={detail} onOpenOther={onOpenOther} />


      <AttachmentsSection projectId={projectId} repository={repository} detail={detail} onChanged={onChanged} />

      <DevelopmentSection detail={detail} />

      <LinksSection
        projectId={projectId}
        repository={repository}
        detail={detail}
        allCards={linkable}
        onOpenOther={onOpenOther}
        onChanged={onChanged}
        reportConflict={reportConflict}
        onError={setError}
      />
      <QualityLineageSection detail={detail} linkable={linkable} onOpenOther={onOpenOther} />
      <SentBackSection detail={detail} />
      <CommentsSection detail={detail} comments={comments} />
    </div>
  );
}
