"use client";

import type { Editor } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn, Popover, PopoverAnchor, PopoverContent } from "@javadaba/ui";

import type { SuggestionStore } from "./suggestions";

export interface MenuOption {
  id: string;
  label: string;
  /** A second, quieter line: a page's path, a member's role. */
  detail?: string;
  icon?: LucideIcon;
  choose: () => void;
}

export interface SuggestionMenuProps {
  editor: Editor;
  store: SuggestionStore;
  /** What was typed after the trigger: the highlighted option goes back to the first when it changes. */
  query: string;
  rect: () => DOMRect | null;
  options: readonly MenuOption[];
  /** The listbox's accessible name ("Blocks", "Pages and members"). */
  label: string;
  /** A line over the list that says what it lists ("Blocks matching “dia”"). */
  heading?: string;
  /** Said when nothing matches, or while results load. */
  message?: string;
  /** The message is a failure the person must notice (a page that could not be created). */
  alert?: boolean;
}

/**
 * The list a trigger opens (JAVA-796), driven from the editor: focus never leaves the text, so the
 * editor is the combobox. Arrows move, Enter or Tab chooses, Escape closes (the suggestion plugin's
 * own). The editor points at the highlighted option with `aria-activedescendant`, which is how a
 * screen reader follows a list it never focuses. In a portal (`Popover`, layout floor L1).
 */
export function SuggestionMenu({ editor, store, query, rect, options, label, heading, message, alert }: SuggestionMenuProps) {
  const listId = useId();
  const [highlight, setHighlight] = useState({ query, index: 0 });
  const index = highlight.query === query ? Math.min(highlight.index, Math.max(options.length - 1, 0)) : 0;
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const anchor = useRef({ getBoundingClientRect: () => rect() ?? new DOMRect() });

  useEffect(() => {
    anchor.current.getBoundingClientRect = () => rect() ?? new DOMRect();
  }, [rect]);

  useEffect(() => {
    store.keyHandler = (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setHighlight({ query, index: (index + step + options.length) % Math.max(options.length, 1) });
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const chosen = options[index];
        if (!chosen) return false;
        chosen.choose();
        return true;
      }
      return false;
    };
    return () => {
      store.keyHandler = null;
    };
  }, [store, options, index, query]);

  useEffect(() => {
    const dom = editor.view.dom;
    dom.setAttribute("aria-haspopup", "listbox");
    dom.setAttribute("aria-controls", listId);
    if (options[index]) dom.setAttribute("aria-activedescendant", `${listId}-${index}`);
    else dom.removeAttribute("aria-activedescendant");
    optionRefs.current[index]?.scrollIntoView?.({ block: "nearest" });
    return () => {
      dom.removeAttribute("aria-haspopup");
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-activedescendant");
    };
  }, [editor, listId, index, options]);

  return (
    <Popover open onOpenChange={(open) => !open && store.set(null)}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="w-72"
      >
        {heading && (
          <p aria-hidden="true" className="px-3 pt-2 font-[family-name:var(--font-jd-kicker)] text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">
            {heading}
          </p>
        )}
        <ul id={listId} role="listbox" aria-label={label} className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1">
          {options.map((option, i) => {
            const Icon = option.icon;
            return (
              <li
                key={option.id}
                id={`${listId}-${i}`}
                ref={(node) => {
                  optionRefs.current[i] = node;
                }}
                role="option"
                aria-selected={i === index}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => i !== index && setHighlight({ query, index: i })}
                onClick={() => option.choose()}
                className={cn(
                  "flex min-h-9 cursor-pointer flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 py-1 text-sm pointer-coarse:min-h-11",
                  i === index ? "bg-[color:var(--jd-ink)]/[0.08] text-[color:var(--jd-ink)]" : "text-[color:var(--jd-ink)]",
                )}
              >
                {Icon && (
                  <span aria-hidden="true" className="flex size-8 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-card)] text-[color:var(--jd-muted)]">
                    <Icon size={16} />
                  </span>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{option.label}</span>
                  {option.detail && <span className="truncate text-xs text-[color:var(--jd-muted)]">{option.detail}</span>}
                </span>
              </li>
            );
          })}
        </ul>
        {message && (
          <p role={alert ? "alert" : "status"} className="px-3 pb-2 text-xs text-[color:var(--jd-muted)]">
            {message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
