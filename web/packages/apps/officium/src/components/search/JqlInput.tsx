"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Textarea, cn } from "@javadaba/ui";

import { suggestJql, type JqlSuggestion, type JqlVocabulary } from "../../lib/backlog/jql";

export interface JqlInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter with nothing highlighted: run the query. */
  onSubmit: () => void;
  vocabulary: JqlVocabulary;
  invalid?: boolean;
  /** Id of the element that describes an error, for `aria-describedby`. */
  describedBy?: string;
}

/**
 * The query box: a combobox over `suggestJql`, the way Jira's JQL field behaves, because that is
 * the muscle memory this view is for. The list offers what can come next -- a field, an operator
 * the field takes, one of its values, a keyword -- and filters by the word being typed.
 *
 * Nothing is highlighted until an arrow key says so, so Enter always runs the query unless the
 * person chose a suggestion first (with a highlight, Enter would keep accepting the next one and
 * the query could never be run from the keyboard). Tab takes the highlighted suggestion, or the
 * first one.
 *
 * The list renders IN FLOW under the field, not floating (layout floor L1/L2): the view scrolls,
 * and a positioned list inside it would be clipped at its edge.
 */
export function JqlInput({ value, onChange, onSubmit, vocabulary, invalid, describedBy }: JqlInputProps) {
  const id = useId();
  const listId = `${id}-list`;
  const ref = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const [caret, setCaret] = useState(value.length);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = useMemo(() => suggestJql(value, caret, vocabulary), [value, caret, vocabulary]);
  const items = open ? suggestions.items : [];

  // A suggestion rewrites the text, so the caret has to be put back after React commits it.
  useLayoutEffect(() => {
    if (pendingCaret.current === null || !ref.current) return;
    ref.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  function accept(item: JqlSuggestion) {
    const rest = value.slice(suggestions.to).replace(/^\s+/, "");
    const next = `${value.slice(0, suggestions.from)}${item.insert} ${rest}`;
    const at = suggestions.from + item.insert.length + 1;
    pendingCaret.current = at;
    setCaret(at);
    setActive(-1);
    onChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Tab" && items.length > 0 && !event.shiftKey) {
      event.preventDefault();
      accept(items[Math.max(active, 0)]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && items[active]) accept(items[active]);
      else {
        setOpen(false);
        onSubmit();
      }
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const readCaret = () => setCaret(ref.current?.selectionStart ?? value.length);

  return (
    <div>
      <Textarea
        ref={ref}
        id={id}
        rows={1}
        role="combobox"
        aria-label="Query"
        aria-autocomplete="list"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 && items[active] ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        spellCheck={false}
        autoComplete="off"
        placeholder='status = "In progress" AND priority >= High ORDER BY updated DESC'
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") readCaret();
        }}
        onClick={() => {
          readCaret();
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
        className={cn(
          "min-h-11 resize-none font-mono [field-sizing:content]",
          invalid && "border-destructive focus-visible:border-destructive",
        )}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={items.length === 0}
        className="mt-1 max-h-64 overflow-y-auto rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] p-1 shadow-[var(--jd-shadow-overlay)]"
      >
        {items.map((item, i) => (
          <li
            key={`${item.label}-${i}`}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // Keep the focus in the field: a mousedown here would blur it and close the list
            // before the click landed.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => accept(item)}
            className={cn(
              "flex min-h-9 cursor-pointer items-center justify-between gap-4 rounded-[var(--radius-jd-sm)] px-2.5 text-sm",
              i === active ? "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]" : "hover:bg-[color:var(--jd-ink)]/[0.06]",
            )}
          >
            <span className="font-mono">{item.label}</span>
            <span className={cn("text-xs", i === active ? "opacity-80" : "text-[color:var(--jd-muted)]")}>{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
