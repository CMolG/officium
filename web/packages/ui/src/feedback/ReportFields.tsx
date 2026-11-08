"use client";

import * as React from "react";

import { FieldError } from "../ui/field-error";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { FeedbackLabels } from "./labels";
import type { FeedbackKind } from "./submit";

export interface ReportFieldsProps {
  kind: FeedbackKind;
  labels: FeedbackLabels;
  message: string;
  onMessage: (value: string) => void;
  /** The empty-message error shows after a press on Send with nothing written. */
  emptyError: boolean;
  /** `null` hides the email field: a signed-in sender is known already. */
  email: string | null;
  onEmail: (value: string) => void;
  emailError: boolean;
  /** Everything read-only while the report is on its way. */
  locked: boolean;
  messageRef: React.Ref<HTMLTextAreaElement>;
  emailRef: React.Ref<HTMLInputElement>;
}

/** The two fields of the report (Lib-Feedback § 1 Editing), each with its error under it in words and a shape. */
export function ReportFields({ kind, labels, message, onMessage, emptyError, email, onEmail, emailError, locked, messageRef, emailRef }: ReportFieldsProps) {
  const id = React.useId();
  const messageErrorId = `${id}-message-error`;
  const emailErrorId = `${id}-email-error`;
  const question = kind === "problem" ? labels.problemLabel : labels.suggestionLabel;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-message`}>{question}</Label>
        <Textarea
          ref={messageRef}
          id={`${id}-message`}
          autoFocus
          rows={3}
          maxLength={10000}
          value={message}
          readOnly={locked}
          aria-invalid={emptyError || undefined}
          aria-describedby={emptyError ? messageErrorId : undefined}
          onChange={(event) => onMessage(event.target.value)}
        />
        {emptyError && <FieldError id={messageErrorId}>{labels.errorEmpty}</FieldError>}
      </div>
      {email !== null && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>
            {labels.emailLabel}
            <small className="ml-1.5 text-xs font-medium text-[color:var(--jd-faint)]">
              {kind === "problem" ? labels.emailOptionalAnswer : labels.emailOptional}
            </small>
          </Label>
          <Input
            ref={emailRef}
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            readOnly={locked}
            aria-invalid={emailError || undefined}
            aria-describedby={emailError ? emailErrorId : undefined}
            onChange={(event) => onEmail(event.target.value)}
          />
          {emailError && <FieldError id={emailErrorId}>{labels.errorEmail}</FieldError>}
        </div>
      )}
    </>
  );
}
