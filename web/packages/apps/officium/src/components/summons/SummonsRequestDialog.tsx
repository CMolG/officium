"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { Copy } from "../../lib/i18n";
import type { SummonsItem } from "../../lib/summons/summons";
import { RequestAnswerForm } from "../backlog/RequestAnswerForm";

/**
 * A request the person answers from a toast (JAVA-1624): a centred dialog over the page, with what it
 * asks and the same Done or Can't now form the card panel uses. The page behind stays usable; closing
 * it without answering leaves the request pending.
 */
export function SummonsRequestDialog({
  projectId,
  item,
  copy,
  onOpenChange,
  onAnswered,
}: {
  projectId: string;
  item: SummonsItem;
  copy: Copy["summons"];
  onOpenChange: (open: boolean) => void;
  onAnswered: () => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent sheetClose={false} data-testid="summons-request-dialog" className="flex flex-col gap-4">
        <DialogTitle className="text-balance text-lg">
          {item.cardKey} · {item.action ?? item.cardTitle}
        </DialogTitle>
        <DialogDescription className="sr-only">{copy.request}</DialogDescription>
        {item.requestId && (
          <RequestAnswerForm
            projectId={projectId}
            request={{ id: item.requestId }}
            repository={getBacklogRepository()}
            onAnswered={onAnswered}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
