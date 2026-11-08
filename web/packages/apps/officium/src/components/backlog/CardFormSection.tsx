"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardList, ExternalLink } from "lucide-react";

import { Button } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { CardDetail, CardForm, FormAnswer } from "../../lib/backlog/types";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { answerLabel, formatDate } from "../../lib/backlog/format";
import { CardFormModal } from "./CardFormModal";

function valueText(value: FormAnswer["value"]): string {
  if (value === null || value === "") return "Skipped";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return Array.isArray(value) ? value.join(", ") : String(value);
}

function AnswerList({ answers }: { answers: FormAnswer[] }) {
  return (
    <dl className="flex flex-col gap-3">
      {answers.map((answer) => (
        <div key={answer.questionId} className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold uppercase tracking-wide text-[color:var(--jd-muted)]">{answer.prompt}</dt>
          <dd className="whitespace-pre-wrap text-pretty text-base text-[color:var(--jd-ink)]">{valueText(answer.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function EarlierAnswers({ history }: { history: CardForm["history"] }) {
  return (
    <details className="rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        <span>Earlier answers ({history.length})</span>
      </summary>
      <div className="flex flex-col gap-4 pt-2">
        {history.map((entry) => (
          <div key={entry.responseId} className="flex flex-col gap-2">
            <p className="text-xs text-[color:var(--jd-muted)]">
              {entry.respondentName ?? "Someone"} · {formatDate(entry.answeredAt)}
            </p>
            <AnswerList answers={entry.answers} />
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * A human card's form as its primary action (JAVA-890). Open: "Answer (N questions)" opens Quaestio's
 * fill runner in a full-screen modal (JAVA-1045), and the link beside it opens it in its own tab;
 * only the assignee answers, so for anyone else the button says why it is off.
 * Answered: what was answered, read-only. The move to Ready is the server's: when the form says it
 * finished, this only reads the card again and shows what the server decided.
 */
export function CardFormSection({
  projectId,
  repository,
  detail,
  accountId,
  onChanged,
}: {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  accountId: string | undefined;
  onChanged: (next: CardDetail) => void | Promise<void>;
}) {
  const [filling, setFilling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<"read" | "unmoved" | null>(null);
  const form = detail.form;
  if (!form || detail.executor !== "human") return null;

  const isAssignee = accountId !== undefined && detail.assignees.some((a) => a.accountId === accountId);

  // The modal closes as soon as the form says it finished: what the server decided, and any problem
  // reading it back, is shown here in the card, not behind the form.
  async function completed() {
    setFilling(false);
    setChecking(true);
    setProblem(null);
    try {
      const next = await repository.getCard(projectId, detail.id);
      await onChanged(next);
      if (next.form?.state !== "answered") setProblem("unmoved");
    } catch {
      setProblem("read");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section aria-label="Form" data-testid="card-form" className="flex flex-col gap-4 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-ink)]/30 bg-[color:var(--jd-ink)]/[0.03] p-4">
      {form.state === "open" && (
        <>
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <h3 className="flex flex-row items-center gap-2 text-sm font-bold uppercase tracking-wide">
              <ClipboardList size={16} aria-hidden="true" /> Answer this card
            </h3>
            <div className="flex flex-row flex-wrap items-center gap-3">
              {isAssignee && (
                <a
                  href={form.fillPath}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 flex-row items-center gap-1.5 text-sm text-[color:var(--jd-muted)] underline underline-offset-2"
                >
                  <ExternalLink size={14} aria-hidden="true" /> <span>Open the form in its own tab</span>
                </a>
              )}
              <Button type="button" register="ui" size="sm" disabled={!isAssignee} onClick={() => setFilling(true)}>
                {answerLabel(form.questionCount)}
              </Button>
            </div>
          </div>
          {!isAssignee && (
            <p data-testid="card-form-reason" className="text-sm text-[color:var(--jd-muted)]">
              Only the assignee answers this card.
            </p>
          )}
          {isAssignee && (
            <CardFormModal
              open={filling}
              onOpenChange={setFilling}
              cardKey={detail.key}
              cardTitle={detail.title}
              fillPath={form.fillPath}
              onCompleted={() => void completed()}
            />
          )}
          {checking && (
            <p role="status" className="text-sm text-[color:var(--jd-muted)]">
              Saved. Checking where the card went…
            </p>
          )}
          {problem === "unmoved" && (
            <p role="alert" data-testid="card-form-unmoved" className="text-sm font-medium text-destructive">
              Your answers were saved, but the card did not move: only the assignee&apos;s answers move a card that is still waiting on a person.
            </p>
          )}
          {problem === "read" && (
            <div role="alert" className="flex flex-row flex-wrap items-center gap-3 text-sm font-medium text-destructive">
              <span>Your answers were saved, but the card could not be read again.</span>
              <Button type="button" register="ui" size="sm" variant="outline" onClick={() => void completed()}>
                Check the card again
              </Button>
            </div>
          )}
        </>
      )}

      {form.state === "answered" && (
        <>
          <h3 className="flex flex-row flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <CheckCircle2 size={16} aria-hidden="true" /> Answered, in {STATUS_CONFIG[detail.status].label}
            {form.answeredAt && (
              <span className="text-xs font-medium normal-case tracking-normal text-[color:var(--jd-muted)]">{formatDate(form.answeredAt)}</span>
            )}
          </h3>
          <AnswerList answers={form.answers} />
          {form.history.length > 1 && <EarlierAnswers history={form.history.slice(0, -1).reverse()} />}
        </>
      )}

      {form.state === "closed" && (
        <>
          <h3 className="flex flex-row items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <ClipboardList size={16} aria-hidden="true" /> Closed without an answer
          </h3>
          <p className="text-sm text-[color:var(--jd-muted)]">This card moved on before its form was answered.</p>
          {form.history.length > 0 && <EarlierAnswers history={[...form.history].reverse()} />}
        </>
      )}
    </section>
  );
}
