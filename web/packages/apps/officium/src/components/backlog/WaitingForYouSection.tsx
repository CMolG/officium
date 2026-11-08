"use client";

import { useState } from "react";
import { Hourglass } from "lucide-react";

import { MarkdownView } from "@javadaba/rich-text";
import { formatDate } from "../../lib/backlog/format";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { useCardRequests } from "../../lib/backlog/use-card-requests";
import { ANSWER_WORDS, RequestAnswerForm } from "./RequestAnswerForm";

/**
 * "Waiting for you" (JAVA-1122): an agent working this card asked for one quick action. Open, the
 * person answers Done or Can't now (with an optional note); answered, it reads back what they said
 * until the agent closes the request. Reads its own request through `useCardRequests`.
 */
export function WaitingForYouSection({ projectId, repository, cardId }: { projectId: string; repository: BacklogRepository; cardId: string }) {
  const { byCard, refresh } = useCardRequests(projectId, repository);
  const [answeredHere, setAnsweredHere] = useState<string | null>(null);
  const request = byCard.get(cardId);
  if (!request) return null;
  const asker = request.createdBy.agentName ?? request.createdBy.name;

  return (
    <section aria-label="Waiting for you" className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-ink)]/30 bg-[color:var(--jd-accent)]/[0.06] p-4">
      <h3 className="flex flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        <Hourglass size={14} aria-hidden="true" /> Waiting for you
      </h3>
      <p className="text-pretty text-base font-semibold">{request.action}</p>
      {request.why && <p className="text-pretty text-sm text-[color:var(--jd-muted)]">{request.why}</p>}
      {request.detail && <MarkdownView markdown={request.detail} className="text-pretty text-sm leading-relaxed text-[color:var(--jd-ink)]" />}
      <p className="text-xs text-[color:var(--jd-muted)]">Asked by {asker} · {formatDate(request.createdAt)}</p>
      {request.status === "open" ? (
        <RequestAnswerForm
          projectId={projectId}
          request={request}
          repository={repository}
          onAnswered={(sent) => {
            if (sent) setAnsweredHere(request.id);
            void refresh();
          }}
        />
      ) : (
        <div className="flex flex-col gap-1">
          {answeredHere === request.id && <p role="status" className="text-sm font-semibold">Answered — the agent was told</p>}
          <p className="text-sm font-semibold">
            {answeredHere === request.id || !request.answeredBy ? "You" : (request.answeredBy.agentName ?? request.answeredBy.name)} answered {ANSWER_WORDS[request.status === "done" ? "done" : "declined"]}
            {request.status === "done" ? " · waiting for the agent to resume" : ""}
          </p>
          {request.note && <p className="text-sm text-[color:var(--jd-muted)]">Your note: {request.note}</p>}
        </div>
      )}
    </section>
  );
}
