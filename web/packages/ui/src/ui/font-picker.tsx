"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { Glyph } from "./glyph";
import { FontPickerOption } from "./font-picker-option";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Text } from "./text";

/*
 * FontPicker — choose a typeface by SEEING it (JAVA-143).
 *
 * It replaces the native `<select>` the rich-text toolbar used: a select can't draw its options
 * in their own face on every browser, can't group or search them, and can't report which option
 * the pointer is over, which is what a live preview on the selected text needs (JAVA-140). So the
 * picker publishes that moment as `onPreview`: an option's value while it is hovered or reached
 * with the keyboard, `null` when the pointer leaves the list or the sheet closes. It never commits
 * anything by itself -- only a click or Enter calls `onValueChange`.
 *
 * Groups are DERIVED from the CSS stack's generic family (`serif`, `sans-serif`, `monospace`,
 * `cursive`/`fantasy`), so a caller passes the stacks it already has; `group` overrides it for a
 * stack whose generic family says nothing useful.
 *
 * The search field keeps the focus while the list is walked (`aria-activedescendant`), so typing
 * narrows the list without leaving the arrows. On touch the field does not take the focus when the
 * sheet opens: the on-screen keyboard would cover the list the person came to tap.
 */

export type FontGroup = "serif" | "sans" | "mono" | "display";

export interface FontOption {
  /** The CSS font stack the option applies. */
  value: string;
  label: string;
  /** Overrides the group derived from the stack's generic family. */
  group?: FontGroup;
  /** A quiet line under the name: "Titles only". */
  note?: string;
  /** Why this face cannot be picked. It stays in the list, dimmed, with this as its line. */
  unavailable?: string;
}

const GROUP_ORDER: FontGroup[] = ["serif", "sans", "mono", "display"];

const DEFAULT_GROUP_LABELS: Record<FontGroup, string> = {
  serif: "Serif",
  sans: "Sans serif",
  mono: "Monospace",
  display: "Display",
};

/** The group a CSS font stack belongs to, read from its generic family. No generic → sans. */
export function fontGroupOf(stack: string): FontGroup {
  const families = stack.split(",").map((family) => family.trim().replace(/^["']|["']$/g, "").toLowerCase());
  if (families.includes("monospace")) return "mono";
  if (families.includes("sans-serif") || families.includes("system-ui")) return "sans";
  if (families.includes("serif")) return "serif";
  if (families.includes("cursive") || families.includes("fantasy")) return "display";
  return "sans";
}

/** The first family of a stack, unquoted: how a font the list doesn't know is named. */
export function fontLabelOf(stack: string): string {
  return stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
}

export interface FontPickerProps {
  /** The current stack; `""` is the default font. */
  value: string;
  onValueChange: (value: string) => void;
  fonts: FontOption[];
  /** The option being considered (hover, keyboard), or `null` once nothing is. */
  onPreview?: (value: string | null) => void;
  /** Greyed out WITH its reason; the sheet doesn't open. */
  unavailable?: string;
  label?: string;
  defaultLabel?: string;
  searchLabel?: string;
  emptyLabel?: string;
  /** The button that clears a search that matched nothing. */
  clearLabel?: string;
  groupLabels?: Partial<Record<FontGroup, string>>;
  side?: "top" | "bottom";
  /**
   * Hand the focus back to the trigger on close. Off when the picker edits a selection that lives
   * elsewhere (a text editor), which takes the focus back itself.
   */
  restoreFocus?: boolean;
  className?: string;
  "data-testid"?: string;
}

interface Row {
  option: FontOption;
  group: FontGroup | null;
}

export function FontPicker({
  value,
  onValueChange,
  fonts,
  onPreview,
  unavailable,
  label = "Font",
  defaultLabel = "Default font",
  searchLabel = "Search fonts",
  emptyLabel = "No font matches",
  clearLabel = "Clear search",
  groupLabels,
  side = "bottom",
  restoreFocus = true,
  className,
  "data-testid": testId,
}: FontPickerProps) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const pointerType = React.useRef<string>("mouse");
  const search = React.useRef<HTMLInputElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  const labels = { ...DEFAULT_GROUP_LABELS, ...groupLabels };

  // A font the document already carries stays selectable even when the list doesn't offer it.
  const known = value === "" || fonts.some((font) => font.value === value);
  const all = known ? fonts : [...fonts, { value, label: fontLabelOf(value) }];
  const current = all.find((font) => font.value === value);

  const rowsFor = (search: string): Row[] => {
    const needle = search.trim().toLowerCase();
    return [
      ...(needle ? [] : [{ option: { value: "", label: defaultLabel }, group: null }]),
      ...GROUP_ORDER.flatMap((group) =>
        all
          .filter((font) => (font.group ?? fontGroupOf(font.value)) === group)
          .filter((font) => !needle || font.label.toLowerCase().includes(needle))
          .map((option) => ({ option, group })),
      ),
    ];
  };
  const rows = rowsFor(query);
  const optionId = (index: number) => `${id}-option-${index}`;

  const openWith = (next: boolean) => {
    if (next && unavailable) return;
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(Math.max(0, rowsFor("").findIndex((row) => row.option.value === value)));
    } else {
      onPreview?.(null);
    }
  };

  const consider = (index: number) => {
    setActive(index);
    onPreview?.(rows[index]?.option.value ?? null);
    list.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const choose = (next: string) => {
    setOpen(false);
    onPreview?.(null);
    onValueChange(next);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (rows.length === 0) return;
    const last = rows.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: active >= last ? 0 : active + 1,
      ArrowUp: active <= 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (event.key in moves) {
      event.preventDefault();
      consider(moves[event.key]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[Math.min(active, last)];
      if (row) choose(row.option.value);
    }
  };

  const triggerLabel = current?.label ?? defaultLabel;

  return (
    <Popover open={open && !unavailable} onOpenChange={openWith}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          register="ui"
          size="sm"
          aria-label={label}
          aria-disabled={unavailable ? true : undefined}
          title={unavailable ?? `${label}: ${triggerLabel}`}
          // The picker edits something that lives elsewhere (a selection): a press must not move
          // the focus, or the selection it is about to change goes with it.
          onMouseDown={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            pointerType.current = event.pointerType;
          }}
          className={cn("max-w-36 gap-1 px-2 text-[color:var(--jd-muted)] pointer-coarse:h-11", className)}
          data-testid={testId}
        >
          <Text className="truncate" style={{ fontFamily: value || undefined }}>
            {triggerLabel}
          </Text>
          <Glyph name="chevron-down" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        sideOffset={6}
        className="w-64"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (pointerType.current !== "touch") search.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (!restoreFocus) event.preventDefault();
        }}
      >
        <div className="flex flex-col" onKeyDown={onKeyDown}>
          <div className="flex flex-col p-2">
            <Input
              ref={search}
              role="combobox"
              aria-label={searchLabel}
              aria-expanded
              aria-controls={`${id}-list`}
              aria-autocomplete="list"
              aria-activedescendant={rows[active] ? optionId(active) : undefined}
              placeholder={searchLabel}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              className="min-h-10"
            />
          </div>
          <div
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-label={label}
            className="flex max-h-72 flex-col overflow-y-auto py-1"
            onPointerLeave={() => onPreview?.(null)}
          >
            {rows.length === 0 && (
              <div className="flex flex-col items-start gap-2 px-3 py-2" role="status">
                <Text as="p" size="xs" tone="muted">
                  {`${emptyLabel} “${query.trim()}”.`}
                </Text>
                <Button type="button" register="ui" size="sm" variant="secondary" onClick={() => setQuery("")}>
                  {clearLabel}
                </Button>
              </div>
            )}
            {rows.map((row, index) => {
              const heading = row.group !== null && (index === 0 || rows[index - 1].group !== row.group);
              const selected = row.option.value === value;
              return (
                <React.Fragment key={`${row.group ?? "default"}-${row.option.value}`}>
                  {heading && (
                    <Text
                      font="kicker"
                      tone="muted"
                      className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.14em]"
                      aria-hidden="true"
                    >
                      {labels[row.group as FontGroup]}
                    </Text>
                  )}
                  <FontPickerOption
                    id={optionId(index)}
                    index={index}
                    label={row.option.label}
                    stack={row.option.value}
                    selected={selected}
                    active={index === active}
                    note={row.option.note}
                    unavailable={row.option.unavailable}
                    onConsider={() => {
                      if (index !== active) consider(index);
                    }}
                    onChoose={() => choose(row.option.value)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
