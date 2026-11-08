"use client";

import { useState } from "react";

import { Button, Textarea } from "@javadaba/ui";

import { answerErrorMessage, MAX_NOTE_LENGTH, type CardRequest, type RequestAnswer } from "../../lib/backlog/card-requests";
import type { BacklogRepository } from "../../lib/backlog/repository";

export const ANSWER_WORDS: Record<RequestAnswer, string> = { done: "Done", declined: "Can't now" };

/** The open request's controls: an optional note, then Done or Can't now. */
export function RequestAnswerForm({ projectId, request, repository, onAnswered }: { projectId: string; request: Pick<CardRequest, "id">; repository: BacklogRepository; onAnswered: (sent: boolean) => void }) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState<RequestAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(answer: RequestAnswer) {
    setSending(answer);
    setError(null);
    try {
      await repository.answerRequest(projectId, request.id, answer, note);
      onAnswered(true);
    } catch (err) {
      setError(answerErrorMessage(err));
      if ((err as { code?: string } | null)?.code === "request_not_open") onAnswered(false);
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        <span>Add a note (optional, never a password or key)</span>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={MAX_NOTE_LENGTH} disabled={sending !== null} />
      </label>
      <div className="flex flex-row flex-wrap items-center gap-2">
        {(["done", "declined"] as const).map((answer) => (
          <Button
            key={answer}
            type="button"
            register="ui"
            variant={answer === "done" ? "solid" : "outline"}
            className="min-h-11"
            disabled={sending !== null}
            onClick={() => void send(answer)}
          >
            {sending === answer ? "Sending…" : ANSWER_WORDS[answer]}
          </Button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm font-medium text-[color:var(--jd-ink)]">{error}</p>}
    </div>
  );
}
