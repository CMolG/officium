"use client";

import * as React from "react";
import { copyText } from "@javadaba/sdk/platform";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogCloseButton } from "../ui/dialog-close-button";
import { Note } from "../ui/note";
import { Spinner } from "../ui/spinner";
import type { FeedbackMetadata } from "./collect-metadata";
import { fillLabel, type FeedbackLabels } from "./labels";
import { KindPicker } from "./KindPicker";
import { ReportFields } from "./ReportFields";
import { ReportPreview } from "./ReportPreview";
import { ReportSent } from "./ReportSent";
import type { ReportPreview as Preview } from "./report-subject";
import { DEFAULT_RETRY_AFTER, submitReport, type FeedbackKind, type ReportInput, type SubmitResult } from "./submit";
import { useCountdown } from "./use-countdown";

type Failure = Extract<SubmitResult, { ok: false }>;
type Phase = { name: "editing" } | { name: "sending" } | { name: "sent" } | { name: "error"; failure: Failure };

/** An address needs an @ and a dot-ending after it; anything stricter is the server's to say. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ReportDialogProps {
  kind: FeedbackKind;
  onKindChange: (kind: FeedbackKind) => void;
  onClose: () => void;
  labels: FeedbackLabels;
  /** Captured when the menu opened, so it describes the spot the person right-clicked. */
  metadata: FeedbackMetadata;
  /** Anonymous senders may leave an email; a signed-in one is known already. */
  signedIn: boolean;
  /** A local picture of what is reported; never part of the payload. */
  preview?: Preview;
  /** Injected by tests; the default posts to the feedback context. */
  submit?: (input: ReportInput) => Promise<SubmitResult>;
}

const FAILURE_TEXT = (labels: FeedbackLabels, reason: Failure["reason"]) =>
  ({ network: labels.failedNetwork, invalid: labels.failedInvalid, unknown: labels.failedUnknown, rate_limited: labels.limitedBody })[reason];

/**
 * Tell us, with the thing attached (Lib-Feedback § The report dialog): Problem or Suggestion, the message,
 * an optional email, and what was pointed at. Every failure keeps the text the person wrote, says what
 * happened in words and offers the way on. Mounted per opening.
 */
export function ReportDialog({ kind, onKindChange, onClose, labels, metadata, signedIn, preview, submit = submitReport }: ReportDialogProps) {
  const [message, setMessage] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>({ name: "editing" });
  const [emptyError, setEmptyError] = React.useState(false);
  const [emailError, setEmailError] = React.useState(false);
  const messageRef = React.useRef<HTMLTextAreaElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  // One id per opening: pressing Send again after a failure cannot make a second report.
  const [reportId] = React.useState(() => globalThis.crypto.randomUUID());

  const sending = phase.name === "sending";
  const failure = phase.name === "error" ? phase.failure : null;
  const pause = failure?.reason === "rate_limited" ? (failure.retryAfter ?? DEFAULT_RETRY_AFTER) : null;
  const left = useCountdown(pause);
  const asleep = pause !== null && left > 0;
  const title = kind === "problem" ? labels.problemTitle : labels.suggestionTitle;
  const sendLabel = kind === "problem" ? labels.sendProblem : labels.sendSuggestion;

  const send = async () => {
    if (sending || asleep) return;
    if (message.trim().length === 0) {
      setEmptyError(true);
      messageRef.current?.focus();
      return;
    }
    if (!signedIn && email.trim() && !EMAIL_SHAPE.test(email.trim())) {
      setEmailError(true);
      emailRef.current?.focus();
      return;
    }
    setPhase({ name: "sending" });
    const result = await submit({ kind, message, contactEmail: signedIn ? undefined : email, metadata, reportId });
    setPhase(result.ok ? { name: "sent" } : { name: "error", failure: result });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-jd-feedback-report=""
        data-jd-floating-layer=""
        aria-describedby={undefined}
        className="max-w-md"
        onKeyDown={(event) => event.key === "Enter" && (event.metaKey || event.ctrlKey) && void send()}
      >
        {phase.name === "sent" ? (
          <ReportSent labels={labels} withPicture={Boolean(preview?.subject)} email={signedIn ? undefined : email} onClose={onClose} />
        ) : (
          <>
            <DialogHeader className="flex-row items-start justify-between gap-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogCloseButton label={labels.close} className="max-sm:hidden" />
            </DialogHeader>
            <KindPicker kind={kind} labels={labels} disabled={sending} onChange={onKindChange} />
            {failure && (
              <Note tone="danger">
                <b>{failure.reason === "rate_limited" ? labels.limitedTitle : labels.failedTitle}</b>{" "}
                {fillLabel(FAILURE_TEXT(labels, failure.reason), { seconds: pause ?? 0 })}
              </Note>
            )}
            <ReportFields
              kind={kind}
              labels={labels}
              message={message}
              onMessage={(value) => (setMessage(value), setEmptyError(false))}
              emptyError={emptyError}
              email={signedIn ? null : email}
              onEmail={(value) => (setEmail(value), setEmailError(false))}
              emailError={emailError}
              locked={sending}
              messageRef={messageRef}
              emailRef={emailRef}
            />
            {preview && !sending && <ReportPreview preview={preview} labels={labels} route={metadata.access.route} />}
            <DialogFooter>
              {failure && failure.reason !== "rate_limited" ? (
                <Button register="ui" variant="ghost" onClick={() => void copyText(message)}>
                  {labels.copyText}
                </Button>
              ) : (
                <Button register="ui" variant="ghost" disabled={sending} onClick={onClose}>
                  {labels.cancel}
                </Button>
              )}
              <Button register="ui" busy={sending} disabled={asleep} onClick={() => void send()}>
                {sending ? labels.sending : asleep ? fillLabel(labels.sendIn, { seconds: left }) : failure ? labels.tryAgain : sendLabel}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
