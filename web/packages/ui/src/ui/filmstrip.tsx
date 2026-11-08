"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "../lib/cn";
import { FilmstripRuler, startOf } from "./filmstrip-ruler";
import { FilmstripSegmentView } from "./filmstrip-segment";
import { Text } from "./text";
import { minTrackWidth, stripName, tabStopId, totalSeconds, type FilmstripSegment } from "./filmstrip.shared";

/*
 * Filmstrip — a timeline whose segment widths are seconds (JAVA-1290).
 *
 * Segments tile the time axis exactly (`flex-grow: seconds; flex-basis: 0` in a flex-row; no grid,
 * no calc(), so Yoga can draw it). States are shape plus word, never color alone. At least 12 px
 * per second at every width, with the strip's own horizontal scroll: the page never scrolls
 * sideways. With `onSelect` the strip is one tab stop with arrow keys and its segments are buttons
 * 44 px tall. It fetches nothing: a gap is its error, and a load failure is the consumer's banner.
 */

export interface FilmstripProps {
  segments: FilmstripSegment[];
  /** Segment ids. `playing` wins visually when both name the same segment. */
  current?: string;
  playing?: string;
  size?: "sm" | "lg";
  ruler?: "ends" | "ticks";
  onSelect?: (id: string) => void;
  /** Why the strip cannot be used right now; printed under it, and no segment is a button. */
  disabledReason?: string;
  loading?: boolean;
  emptyLabel?: string;
  "aria-label"?: string;
  className?: string;
}

export function Filmstrip({
  segments, current, playing, size = "sm", ruler, onSelect, disabledReason, loading, emptyLabel = "No shots yet",
  "aria-label": ariaLabel, className,
}: FilmstripProps) {
  const reasonId = useId();
  const region = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const select = disabledReason ? undefined : onSelect;
  const total = totalSeconds(segments);
  const [focused, setFocused] = useState<string>();
  const initialStop = tabStopId(segments, current, playing);
  const stop = focused && segments.some((s) => s.id === focused) ? focused : initialStop;
  const followed = playing ?? current;

  // Keep the followed segment in view by moving the strip's own scroll, never the page's.
  useEffect(() => {
    const box = region.current;
    const node = followed ? (nodes.current.get(followed) ?? null)?.parentElement : null;
    if (!box || !node) return;
    const left = node.offsetLeft;
    const right = left + node.offsetWidth;
    if (left < box.scrollLeft) box.scrollLeft = left;
    else if (right > box.scrollLeft + box.clientWidth) box.scrollLeft = right - box.clientWidth;
  }, [followed]);

  if (loading || segments.length === 0) {
    return (
      <div className={className} aria-busy={loading || undefined} role="status">
        <div className="flex flex-row h-8 items-center rounded-[var(--radius-jd-xs)] border border-[color:var(--jd-control-border)] px-2">
          <Text font="kicker" tone="muted" className="text-[10px]">{loading ? "Loading the timeline" : emptyLabel}</Text>
        </div>
      </div>
    );
  }

  const move = (event: KeyboardEvent<HTMLUListElement>) => {
    const ids = segments.map((s) => s.id);
    const active = (event.target as HTMLElement).getAttribute("data-segment-id");
    const at = active ? ids.indexOf(active) : -1;
    if (at < 0) return;
    const next =
      event.key === "ArrowRight" ? Math.min(ids.length - 1, at + 1)
      : event.key === "ArrowLeft" ? Math.max(0, at - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? ids.length - 1
      : -1;
    if (next < 0) return;
    event.preventDefault();
    nodes.current.get(ids[next]!)?.focus();
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div ref={region} className="relative w-full min-w-0 overflow-x-auto">
        <div style={{ minWidth: minTrackWidth(total) }}>
          <ul
            role={select ? "toolbar" : "list"}
            aria-label={ariaLabel ?? stripName(segments)}
            aria-describedby={disabledReason ? reasonId : undefined}
            onKeyDown={select ? move : undefined}
            className="m-0 flex list-none flex-row p-1"
          >
            {segments.map((segment, i) => (
              <FilmstripSegmentView
                key={segment.id}
                segment={segment}
                size={size}
                last={i === segments.length - 1}
                current={segment.id === current}
                playing={segment.id === playing}
                onSelect={select}
                onFocusSegment={setFocused}
                tabIndex={select ? (segment.id === stop ? 0 : -1) : undefined}
                segmentRef={(node) => {
                  if (node) nodes.current.set(segment.id, node);
                  else nodes.current.delete(segment.id);
                }}
              />
            ))}
          </ul>
          {ruler ? <FilmstripRuler mode={ruler} total={total} currentAt={current ? { id: current, start: startOf(segments, current) } : undefined} /> : null}
        </div>
      </div>
      {disabledReason ? (
        <Text id={reasonId} as="p" size="xs" tone="muted" className="mt-1">{disabledReason}</Text>
      ) : null}
    </div>
  );
}
