"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

/**
 * The collapse a card's conversation uses (JAVA-522), in its two shapes: a list that shows its
 * first few items with the rest behind one button, and a text clamped to its beginning with
 * "See more". Comments use both; replies (JAVA-524) reuse them for "first reply shown, the rest
 * behind a button".
 *
 * Neither animates its height (`native-portability.md` rule 9): expanding is a state change, and
 * the content simply lays out taller.
 */

/** The first `visible` items, the rest behind one button whose label the caller words. */
export function CollapsedList<T>({
  items,
  visible,
  itemKey,
  renderItem,
  moreLabel,
  pinned,
  className,
  "aria-label": ariaLabel,
}: {
  items: readonly T[];
  visible: number;
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** "Show 4 older comments", "Show 2 more replies": the hidden count is the caller's to word. */
  moreLabel: (hidden: number) => string;
  /** An item that must not be hidden, like a reply the viewer just posted: the list opens for it. */
  pinned?: (item: T) => boolean;
  className?: string;
  /** Names the list as a group, like the replies to one comment. */
  "aria-label"?: string;
}) {
  const [opened, setOpened] = useState(false);
  const expanded = opened || (pinned !== undefined && items.slice(visible).some(pinned));
  const hidden = expanded ? 0 : Math.max(0, items.length - visible);
  const shown = hidden > 0 ? items.slice(0, visible) : items;
  return (
    <div className={className} role={ariaLabel ? "group" : undefined} aria-label={ariaLabel}>
      {shown.map((item) => (
        <div key={itemKey(item)} className="flex flex-col">{renderItem(item)}</div>
      ))}
      {hidden > 0 && (
        <Button
          type="button"
          register="ui"
          size="sm"
          variant="ghost"
          className="h-11 self-start"
          aria-expanded={false}
          onClick={() => setOpened(true)}
        >
          <ChevronDown size={14} aria-hidden="true" />
          <Text>{moreLabel(hidden)}</Text>
        </Button>
      )}
    </div>
  );
}

/** Six lines of `text-sm leading-relaxed` (1.625), in `em` of the clamp's own text size: the
 *  `max-h-[9.75em]` below, which Tailwind needs written out. */
const CLAMP_EM = 9.75;

/**
 * Its children clamped to about six lines of body text, with "See more" when they run past that
 * and "See less" once opened. Whether they run past is MEASURED, not guessed from the source: a
 * short paragraph wraps to eight lines on a phone, and a long Markdown list may fit on a desktop.
 */
export function ClampedText({
  children,
  initiallyExpanded = false,
  className,
}: {
  children: ReactNode;
  /** A comment the viewer has just posted is shown whole. */
  initiallyExpanded?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [overflows, setOverflows] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Measured against the clamp's height in both states, so an opened text keeps "See less" and
  // a short one never shows a control, however it started.
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollHeight > parseFloat(getComputedStyle(node).fontSize) * CLAMP_EM + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col">
      <div
        ref={box}
        data-clamped={!expanded && overflows ? "true" : undefined}
        className={`text-sm ${expanded ? "" : "max-h-[9.75em] overflow-hidden"} ${className ?? ""}`}
      >
        {children}
      </div>
      {overflows && (
        <Button
          type="button"
          register="ui"
          size="sm"
          variant="ghost"
          className="h-11 self-start"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          <Text>{expanded ? "See less" : "See more"}</Text>
        </Button>
      )}
    </div>
  );
}
