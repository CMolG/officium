"use client";

import type { ChainedCommands } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { ChevronDown, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Pilcrow, type LucideIcon } from "lucide-react";

import { Button, cn, Popover, PopoverContent, PopoverTrigger, Toggle } from "@javadaba/ui";

import { runBlockCommand } from "./selection";
import type { ToolbarLabels } from "./toolbar";

/*
 * The toolbar's block-type menu (Paragraph and the headings), split out of `toolbar.tsx` so each file
 * stays under the ceiling: its trigger, its options and the preview-on-hover that restores on leave.
 */

/** An action reads at the same ink as an unpressed toggle, so the row reads as one set. */
export const ACTION_INK = "text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)]";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_ICONS: Record<HeadingLevel, LucideIcon> = {
  1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4, 5: Heading5, 6: Heading6,
};

/** Paragraph (0) or a heading level: what the block menu applies, previewed or chosen. */
export function blockTypeCommand(chain: ChainedCommands, value: number): ChainedCommands {
  return value === 0 ? chain.setParagraph() : chain.setHeading({ level: value as HeadingLevel });
}

export function BlockTypeMenu({
  editor,
  level,
  levels,
  labels,
  unavailable,
  side,
  onPreview,
  onPreviewEnd,
}: {
  editor: Editor;
  level: number;
  levels: HeadingLevel[];
  labels: ToolbarLabels;
  unavailable?: string;
  side: "top" | "bottom";
  /** An option is being considered: hovered with a mouse, or reached with the keyboard. */
  onPreview: (value: number) => void;
  /** Nothing is considered any more: the pointer left the list, or the menu closed. */
  onPreviewEnd: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: number; label: string; icon: LucideIcon }[] = [
    { value: 0, label: labels.paragraph, icon: Pilcrow },
    ...levels.map((l) => ({ value: l, label: labels[`heading${l}`], icon: HEADING_ICONS[l] })),
  ];
  const current = options.find((option) => option.value === level) ?? options[0];
  const CurrentIcon = current.icon;

  const choose = (value: number) => {
    onPreviewEnd();
    runBlockCommand(editor, (chain) => blockTypeCommand(chain, value));
    setOpen(false);
  };

  // A portal, not an `absolute` box: the menu must never be clipped by a scrolling parent
  // (layout floor L1, `.harness/rules/interface-psychology.md`) -- Officium draws this
  // toolbar inside a dialog that scrolls.
  return (
    <Popover
      open={open && !unavailable}
      onOpenChange={(next) => {
        setOpen(next && !unavailable);
        if (!next) onPreviewEnd();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          register="ui"
          size="sm"
          // The option list is read by name ("Heading 2"): the trigger is named for what it
          // does, so it never answers to an option's name too.
          aria-label={labels.blockType}
          title={unavailable ?? `${labels.blockType}: ${current.label}`}
          aria-disabled={unavailable ? true : undefined}
          onMouseDown={(event) => event.preventDefault()}
          className={cn("shrink-0 gap-1 px-2 pointer-coarse:h-11", ACTION_INK)}
          data-testid="heading-selector"
        >
          <CurrentIcon size={14} strokeWidth={2} aria-hidden="true" />
          <span className="hidden sm:inline">{current.label}</span>
          <ChevronDown size={10} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        sideOffset={6}
        // The caret stays in the text: opening the menu must not move focus out of the editor,
        // and closing it must not hand focus to the trigger.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="min-w-40"
      >
        <div className="flex flex-col gap-0.5 p-1" onPointerLeave={onPreviewEnd}>
          {options.map((option) => {
            const OptionIcon = option.icon;
            return (
              <Toggle
                key={option.value}
                size="sm"
                pressed={option.value === current.value}
                onMouseDown={(event) => event.preventDefault()}
                // Touch has no hover: a tap is a choice, not a preview.
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") onPreview(option.value);
                }}
                onFocus={() => onPreview(option.value)}
                onPressedChange={() => choose(option.value)}
                className="w-full justify-start px-2 text-xs pointer-coarse:min-h-11"
              >
                <OptionIcon size={14} aria-hidden="true" />
                <span>{option.label}</span>
              </Toggle>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

