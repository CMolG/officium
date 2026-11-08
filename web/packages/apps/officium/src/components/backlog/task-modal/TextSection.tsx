"use client";

import type { ReactNode } from "react";
import { Edit3 } from "lucide-react";

import { useReadOnly } from "../../../lib/backlog/read-only-context";

import { Button } from "@javadaba/ui";
import { MarkdownEditor, MarkdownView, type MarkdownChange } from "@javadaba/rich-text";

import { SectionHeading } from "../SectionHeading";
import { headerLinesApart } from "../../../lib/backlog/plan-header";

/**
 * One of the card's two texts: formatted when read, the ecosystem's editor when edited. Hosted by a Refine slot
 * (JAVA-1592), the slot's numbered heading is the only heading and the header lines read on their own lines.
 */
export function TextSection({
  title,
  icon,
  markdown,
  editing,
  editorKey,
  autoFocus,
  empty,
  startLabel,
  placeholder,
  hosted = false,
  onStart,
  onChange,
  onSubmit,
}: {
  title: string;
  icon: ReactNode;
  markdown: string;
  editing: boolean;
  editorKey: string;
  autoFocus: boolean;
  empty: string;
  startLabel: string;
  placeholder: string;
  hosted?: boolean;
  onStart: () => void;
  onChange: (change: MarkdownChange) => void;
  onSubmit: () => void;
}) {
  // A viewer reads the section: the first step it offers an editor is not offered to them.
  const readOnly = useReadOnly();
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      {!hosted && <SectionHeading icon={icon}>{title}</SectionHeading>}
      {editing ? (
        <MarkdownEditor
          key={editorKey}
          value={markdown}
          onChange={onChange}
          onSubmit={onSubmit}
          label={title}
          placeholder={placeholder}
          autoFocus={autoFocus}
          contentClassName="min-h-40"
          data-testid={`editor-${editorKey}`}
        />
      ) : markdown.trim() ? (
        <MarkdownView markdown={hosted ? headerLinesApart(markdown) : markdown} className="text-pretty text-base leading-relaxed text-[color:var(--jd-ink)]/85" />
      ) : (
        // An empty section says what goes here AND offers the first step (psicologia #2).
        <div className="flex flex-row flex-wrap items-center justify-between gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-4 py-3">
          <p className="text-sm text-[color:var(--jd-muted)]">{empty}</p>
          {!readOnly && (
            <Button type="button" register="ui" variant="outline" size="sm" onClick={onStart}>
              <Edit3 size={14} aria-hidden="true" /> {startLabel}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
