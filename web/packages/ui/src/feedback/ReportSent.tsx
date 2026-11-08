"use client";

import { Doodle } from "@javadaba/brand/doodles";

import { Button } from "../ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { fillLabel, type FeedbackLabels } from "./labels";

export interface ReportSentProps {
  labels: FeedbackLabels;
  /** Whether a picture of what was pointed at went with the report. */
  withPicture: boolean;
  /** The address we will answer to, when the sender left one. */
  email?: string;
  onClose: () => void;
}

/** The report's last step (Lib-Feedback § 3 Sent): the kid saluting, a thank you, what happens next, one Done. */
export function ReportSent({ labels, withPicture, email, onClose }: ReportSentProps) {
  const answer = email?.trim() ? ` ${fillLabel(labels.sentBodyEmail, { email: email.trim() })}` : "";
  return (
    <>
      <DialogHeader>
        <Doodle name="salute" decorative size="heading" className="mb-1" />
        <DialogTitle>{labels.sentTitle}</DialogTitle>
        <DialogDescription>{`${withPicture ? labels.sentBodyPicture : labels.sentBodyPlain}${answer}`}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button register="ui" onClick={onClose}>
          {labels.done}
        </Button>
      </DialogFooter>
    </>
  );
}
