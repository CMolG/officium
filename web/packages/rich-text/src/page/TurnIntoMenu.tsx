"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button, Popover, PopoverContent, PopoverTrigger, Toggle } from "@javadaba/ui";

import { runBlockCommand } from "../selection";
import { canApply, type BlockItem } from "./block-items";

/** What the selected blocks are now: the first item whose node is active. */
function currentItem(editor: Editor, items: readonly BlockItem[]): string {
  if (editor.isActive("heading")) {
    const level = Number(editor.getAttributes("heading").level ?? 1);
    return `heading${level}`;
  }
  for (const id of ["taskList", "bulletList", "orderedList", "blockquote", "codeBlock"]) {
    if (editor.isActive(id)) return id;
  }
  return items[0]?.id ?? "paragraph";
}

/**
 * "Turn into" (JAVA-796): the selected blocks become a heading, a list, a quote or code. The same
 * items the `/` menu offers, so both say the same thing about what a block can be.
 */
export function TurnIntoMenu({ editor, items }: { editor: Editor; items: readonly BlockItem[] }) {
  const [open, setOpen] = useState(false);
  const current = useEditorState({ editor, selector: ({ editor: e }) => currentItem(e, items) });
  const label = items.find((item) => item.id === current)?.label ?? "Text";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          register="ui"
          size="sm"
          aria-label="Turn into"
          title={`Turn into: now ${label}`}
          onMouseDown={(event) => event.preventDefault()}
          className="shrink-0 gap-1 px-2 text-[color:var(--jd-muted)] hover:text-[color:var(--jd-ink)] pointer-coarse:h-11"
        >
          <span className="text-xs">{label}</span>
          <ChevronDown size={10} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" sideOffset={6} onCloseAutoFocus={(event) => event.preventDefault()} className="min-w-44">
        <div className="flex flex-col gap-0.5 p-1">
          {items.map((item) => {
            const Icon = item.icon;
            const available = canApply(editor, item);
            return (
              <Toggle
                key={item.id}
                size="sm"
                pressed={item.id === current}
                aria-disabled={available ? undefined : true}
                title={available ? undefined : "Not available here"}
                onMouseDown={(event) => event.preventDefault()}
                onPressedChange={() => {
                  if (!available) return;
                  runBlockCommand(editor, item.apply);
                  setOpen(false);
                }}
                className="w-full justify-start px-2 text-xs pointer-coarse:min-h-11"
              >
                <Icon size={14} aria-hidden="true" />
                <span>{item.label}</span>
              </Toggle>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
