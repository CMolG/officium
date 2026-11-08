"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../lib/cn";
import { useRestoreFocus } from "../lib/restore-focus";
import { matchesCombo } from "../lib/shortcuts";
import { CommandRow } from "./command-row";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Glyph } from "./glyph";
import { ShortcutKeys } from "./shortcut-keys";
import { Text } from "./text";

/*
 * A command menu: one search box over sections of actions and places (JAVA-799). Items are data,
 * so each app decides what it lists and the piece keeps the keyboard model once: the combobox
 * pattern (`aria-activedescendant`, focus never leaves the box), Up/Down to move (Home/End too while the box is empty), Enter to
 * run, Escape to close, and Mod+K to toggle. Spotlight in web-os has the same model, written
 * apart; moving it onto this piece is JAVA-1473.
 */

export interface CommandItem {
  id: string;
  label: string;
  /** Muted text after the label: a path, a time, the state. */
  hint?: string;
  /** A second line under the label: what the item will do ("In To do, on this board"). */
  description?: string;
  icon?: ReactNode;
  /** An abstract combo, drawn as keycaps (`Mod+.`). */
  shortcut?: string;
  /** Why the item can't run right now. It stays listed, and Enter says why instead of nothing. */
  disabledReason?: string;
  onSelect: () => void;
  /**
   * Where focus goes once the menu has closed, instead of back to where it was: a command that puts the caret
   * somewhere (a title to rename). Read at close, so the element may appear after `onSelect`.
   */
  focusOnClose?: () => HTMLElement | null;
}

export interface CommandSection {
  id: string;
  heading: string;
  items: CommandItem[];
}

export interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: CommandSection[];
  query: string;
  onQueryChange: (query: string) => void;
  /** The dialog's accessible name. */
  title?: string;
  placeholder?: string;
  /** Drawn when no section has an item: the empty state, with its first suggested action. */
  empty?: ReactNode;
}

/** Where focus goes when the menu closes: the chosen item's `focusOnClose`, else back to where it was. */
function useCloseFocus() {
  const restoreFocus = useRestoreFocus();
  const next = useRef<CommandItem["focusOnClose"]>(undefined);
  return {
    choose: (item: CommandItem) => {
      next.current = item.focusOnClose;
    },
    onOpenAutoFocus: restoreFocus.onOpenAutoFocus,
    onCloseAutoFocus: (event: Event) => {
      const target = next.current?.();
      next.current = undefined;
      if (!target?.isConnected) return restoreFocus.onCloseAutoFocus(event);
      event.preventDefault();
      target.focus();
    },
  };
}

export function CommandMenu({
  open,
  onOpenChange,
  sections,
  query,
  onQueryChange,
  title = "Command menu",
  placeholder = "Search pages and commands",
  empty,
}: CommandMenuProps) {
  const base = useId();
  const closeFocus = useCloseFocus();
  const items = sections.flatMap((section) => section.items);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [refused, setRefused] = useState<string | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);
  const active = items.find((item) => item.id === activeId) ?? items[0];

  useEffect(() => {
    if (open) (setActiveId(undefined), setRefused(null));
  }, [open]);

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [active?.id]);

  const optionId = (id: string) => `${base}-${id}`;
  const move = (to: number) => {
    if (items.length === 0) return;
    setRefused(null);
    setActiveId(items[(to + items.length) % items.length].id);
  };
  const run = (item: CommandItem) => {
    if (item.disabledReason) {
      setRefused(item.disabledReason);
      return;
    }
    closeFocus.choose(item);
    onOpenChange(false);
    item.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const at = active ? items.indexOf(active) : -1;
    if (matchesCombo(event.nativeEvent, "Mod+K")) {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    // Home and End move the caret once there is text to move it in; they jump the list only on an empty box.
    const ends: Record<string, number> = query === "" ? { Home: 0, End: items.length - 1 } : {};
    const to: number | undefined = { ArrowDown: at + 1, ArrowUp: at - 1, ...ends }[event.key];
    if (to !== undefined) {
      event.preventDefault();
      move(to);
    } else if (event.key === "Enter" && active && !event.nativeEvent.isComposing) {
      event.preventDefault();
      run(active);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={closeFocus.onOpenAutoFocus}
        onCloseAutoFocus={closeFocus.onCloseAutoFocus}
        sheetClose={false}
        className="top-[20%] flex max-w-xl translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-h-[min(32rem,calc(100%-4rem))]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Type to search. Arrow keys move, Enter runs, Escape closes.</DialogDescription>
        <div className="flex h-14 shrink-0 flex-row items-center gap-3 border-b border-[color:var(--jd-line)] px-4 text-[color:var(--jd-faint)]">
          <Glyph name="search" size={18} />
          <input
            role="combobox"
            aria-expanded
            aria-controls={`${base}-list`}
            aria-activedescendant={active ? optionId(active.id) : undefined}
            aria-label={title}
            autoComplete="off"
            spellCheck={false}
            value={query}
            placeholder={placeholder}
            onChange={(event) => {
              setActiveId(undefined);
              setRefused(null);
              onQueryChange(event.target.value);
            }}
            onKeyDown={onKeyDown}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-[color:var(--jd-ink)] outline-none placeholder:text-[color:var(--jd-faint)] md:text-[15px]"
          />
          <ShortcutKeys combo="Escape" />
        </div>
        <div id={`${base}-list`} role="listbox" aria-label={title} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
          {items.length === 0 && empty}
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.id} role="group" aria-labelledby={`${base}-${section.id}-h`} className="flex flex-col">
                <Text id={`${base}-${section.id}-h`} type="kicker" tone="faint" className="px-2.5 pb-1 pt-3 !text-[10px]">
                  {section.heading}
                </Text>
                {section.items.map((item) => (
                  <CommandRow
                    key={item.id}
                    item={item}
                    id={optionId(item.id)}
                    selected={item === active}
                    rowRef={item === active ? (node) => void (activeRef.current = node) : undefined}
                    onHover={() => item !== active && setActiveId(item.id)}
                    onRun={() => run(item)}
                  />
                ))}
              </div>
            ),
          )}
        </div>
        <Text role="status" className={cn("block border-t border-[color:var(--jd-line)] px-4 py-2 text-xs text-[color:var(--jd-faint)]", !refused && "sr-only")}>
          {refused ?? ""}
        </Text>
      </DialogContent>
    </Dialog>
  );
}
