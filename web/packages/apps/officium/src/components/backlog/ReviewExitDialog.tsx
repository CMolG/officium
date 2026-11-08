"use client";

import { isApproval } from "../../lib/backlog/quality-lineage";
import { ApproveDialog } from "./ApproveDialog";
import { SendBackDialog, type SendBackDialogProps } from "./SendBackDialog";

/**
 * A card leaving review asks for what the review found (card://JAVA-1526): an approval its scorecard, a send-back
 * its reasons, findings and the rules the work broke (card://JAVA-1416).
 */
export function ReviewExitDialog(props: SendBackDialogProps) {
  return isApproval(props.card.status, props.to, props.card.category) ? <ApproveDialog {...props} /> : <SendBackDialog {...props} />;
}
