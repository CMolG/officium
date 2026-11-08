"use client";

import { ExternalLink, X } from "lucide-react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, Text } from "@javadaba/ui";

import { CardFormFrame } from "./CardFormFrame";

/**
 * A human card's form, answered over the whole screen (JAVA-1045): it rises from the bottom edge and
 * goes back down when it closes, at every width -- the phone sheet of `DialogContent`, applied from
 * `sm` up too, in place of the centred box's pop. Reduced motion keeps the fade (tokens.css § 6).
 * It is a dialog nested in the card's own, so Escape and Close leave the card panel open behind it.
 * The runner inside is still Quaestio's own fill page (JAVA-890), filling the height left under the
 * header instead of the height it posts.
 */
export function CardFormModal({
  open,
  onOpenChange,
  cardKey,
  cardTitle,
  fillPath,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardKey: string;
  cardTitle: string;
  fillPath: string;
  onCompleted: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        sheetClose={false}
        data-testid="card-form-modal"
        className="left-0 top-0 inset-0 flex h-auto max-h-none w-auto max-w-none translate-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-none data-[state=open]:animate-jd-sheet-in data-[state=closed]:animate-jd-sheet-out"
      >
        <header className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-[color:var(--jd-line)] px-4 py-2 sm:px-6">
          <div className="flex min-w-0 flex-col">
            <DialogTitle className="text-base">
              <Text>Answer {cardKey}</Text>
            </DialogTitle>
            <DialogDescription className="truncate">
              <Text>{cardTitle}</Text>
            </DialogDescription>
          </div>
          <div className="flex shrink-0 flex-row items-center gap-2">
            <a
              href={fillPath}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 min-w-11 flex-row items-center justify-center gap-1.5 text-sm text-[color:var(--jd-muted)] underline underline-offset-2"
            >
              <ExternalLink size={14} aria-hidden="true" /> <Text className="max-sm:sr-only">Open the form in its own tab</Text>
            </a>
            <DialogClose asChild>
              <Button type="button" register="ui" size="icon" variant="ghost" aria-label="Close the form" className="size-11">
                <X size={18} aria-hidden="true" />
              </Button>
            </DialogClose>
          </div>
        </header>
        <CardFormFrame fill fillPath={fillPath} title={`Form of ${cardKey}`} onCompleted={onCompleted} />
      </DialogContent>
    </Dialog>
  );
}
