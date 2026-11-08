"use client";

// card://JAVA-1385 [temporary]: moved from TaskModal, which React Compiler skips
"use no memo";

import { useReadOnly } from "../../../lib/backlog/read-only-context";
import type { ReactNode } from "react";
import { Check, Edit3, ExternalLink } from "lucide-react";

import { Button, DialogClose, DialogTitle, Input, useTheaterScene } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import type { CardDetail, Status } from "../../../lib/backlog/types";
import { CardStatusLine } from "./CardStatusLine";

export interface TaskModalHeaderProps {
  detail: CardDetail;
  /** `dialog` has the dialog's title and close, plus a way to the card's page; `page` is that page. */
  surface: "dialog" | "page";
  /** The card's own page, which the dialog links to. */
  pagePath: string;
  isEditing: boolean;
  titleDraft: string;
  setTitleDraft: (draft: string) => void;
  titleBlank: boolean;
  saving: boolean;
  startEditing: () => void;
  cancelEditing: () => void;
  saveEdits: () => Promise<void>;
  childlessEpic: boolean;
  followsChildren: boolean;
  epicChildren: number;
  openChildren: number;
  changeStatus: (next: Status) => Promise<void>;
  /** The Reject action, set after the status picker (card://JAVA-1415). */
  statusAction?: ReactNode;
}

/** The card's title bar: status line, epic notes, title (editable) and the edit and close controls. */
export function TaskModalHeader({
  detail,
  surface,
  pagePath,
  isEditing,
  titleDraft,
  setTitleDraft,
  titleBlank,
  saving,
  startEditing,
  cancelEditing,
  saveEdits,
  childlessEpic,
  followsChildren,
  epicChildren,
  openChildren,
  changeStatus,
  statusAction,
}: TaskModalHeaderProps) {
  const inDialog = surface === "dialog";
  // A viewer reads the card: Edit is not offered (Off-Shell, "Viewers are told").
  const readOnly = useReadOnly();
  // Radix requires a DialogTitle for every DialogContent; the page has no dialog, so its title is a heading.
  // A Theater scene has no h1 (theater contract §7): the page's title drops to h2 while one plays.
  const inTheater = useTheaterScene() !== null;
  const Title = inDialog ? DialogTitle : inTheater ? "h2" : "h1";
  return (
    <header className="flex flex-row shrink-0 max-sm:flex-wrap items-start justify-between gap-4 border-b border-[color:var(--jd-line)] p-5">
      <div className="min-w-0 flex-1 max-sm:basis-full">
        <CardStatusLine
          detail={detail}
          childlessEpic={childlessEpic}
          followsChildren={followsChildren}
          epicChildren={epicChildren}
          openChildren={openChildren}
          changeStatus={changeStatus}
          action={statusAction}
        />
        {childlessEpic && (
          <p data-testid="epic-no-children" className="mt-2 text-xs text-[color:var(--jd-muted)]">
            No children yet: it stays in Refine until a card names {detail.key} as its epic.
          </p>
        )}
        {followsChildren && (
          <p data-testid="epic-follows-children" className="mt-2 text-xs text-[color:var(--jd-muted)]">
            {openChildren > 0
              ? `Its status follows its children: ${openChildren} of ${epicChildren} still open. It closes once every one is done.`
              : "Every child is done: verify the goal end to end, then take it on to Deploy and Completed."}
          </p>
        )}
        {/* Radix requires a DialogTitle for every DialogContent; it stays mounted (visually
            hidden while editing) so the a11y tree never loses it, and the editable Input
            becomes the visible control instead. */}
        <Title className={isEditing ? "sr-only" : "mt-2 break-words text-balance text-2xl font-bold leading-tight sm:text-3xl"}>
          {detail.title}
        </Title>
        {isEditing && (
          <>
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="mt-2 h-auto border-0 border-b-2 p-1 text-2xl font-bold"
              aria-label="Card title"
              aria-invalid={titleBlank || undefined}
            />
            {titleBlank && (
              <p role="alert" className="mt-1 text-xs font-medium text-destructive">
                A card needs a title.
              </p>
            )}
          </>
        )}
      </div>
      {/* On a phone the controls take their own row above the title, so the title keeps the width. */}
      <div className="flex flex-row shrink-0 items-center gap-1 max-sm:order-first max-sm:w-full max-sm:justify-end">
        {isEditing ? (
          <>
            <Button type="button" register="ui" size="sm" variant="ghost" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button
              type="button"
              register="ui"
              size="sm"
              disabled={titleBlank || saving}
              title={titleBlank ? "A card needs a title" : "⌘/Ctrl+Enter"}
              onClick={() => void saveEdits()}
            >
              <Check size={16} aria-hidden="true" /> Save
            </Button>
          </>
        ) : (
          !readOnly && (
            <Button type="button" register="ui" size="icon" variant="ghost" aria-label="Edit" onClick={() => startEditing()}>
              <Edit3 size={18} />
            </Button>
          )
        )}
        {inDialog && (
          <>
            <Button asChild register="ui" size="sm" variant="ghost" className="min-h-11">
              <Link href={pagePath}>
                <ExternalLink size={16} aria-hidden="true" /> Open the card&apos;s page
              </Link>
            </Button>
            <DialogClose asChild>
              <Button type="button" register="ui" size="icon" variant="ghost" aria-label="Close" data-theater-target="card-close" className="size-11">
                ×
              </Button>
            </DialogClose>
          </>
        )}
      </div>
    </header>
  );
}
