"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * A page's title, edited where it is read (JAVA-796): the header's heading itself takes the typing,
 * so the page keeps its heading for a screen reader and the title its place on screen. Enter does
 * not break the line. A blank title is said as an alert and not saved; the text goes on saving.
 * It is the page's rename (JAVA-1537): `headingRef` lets the command menu's Rename put the caret here.
 *
 * The heading's text is written once and then left to the person: React re-rendering it on every
 * key would put the caret back at the start. A newer saved title (another writer) is written in
 * only while the heading is not being typed in.
 */
export function DocTitleField({
  value,
  onChange,
  headingRef,
}: {
  value: string;
  onChange: (title: string) => void;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const own = useRef<HTMLHeadingElement>(null);
  const heading = headingRef ?? own;
  const [initial] = useState(value);
  const blank = !value.trim();

  useEffect(() => {
    const element = heading.current;
    if (element && element.textContent !== value && element.ownerDocument.activeElement !== element) {
      element.textContent = value;
    }
  }, [value, heading]);

  return (
    <span className="flex min-w-0 max-w-full flex-col gap-1">
      <h2
        ref={heading}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        aria-invalid={blank || undefined}
        data-placeholder="Untitled"
        onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        className="w-full min-w-0 break-words rounded-[var(--radius-jd-sm)] text-xl font-bold outline-none sm:text-2xl empty:before:text-[color:var(--jd-faint)] empty:before:content-[attr(data-placeholder)] focus-visible:ring-2 focus-visible:ring-[color:var(--jd-ink)]/20"
        data-testid="doc-title"
      >
        {initial}
      </h2>
      {blank && (
        <span role="alert" className="text-xs font-medium text-destructive">
          A page needs a title.
        </span>
      )}
    </span>
  );
}
