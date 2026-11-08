import { cn } from "../lib/cn";
import { Text } from "./text";
import { Tooltip } from "./tooltip";
import { segmentName, type FilmstripSegment, type FilmstripState } from "./filmstrip.shared";

/*
 * One segment of a Filmstrip (JAVA-1290). The outer box carries only the time axis (`flex-grow` =
 * seconds, no gap, padding or border), so boundaries stay on the ruler's axis; the visible box
 * inside leaves a 2 px seam. `@container` lets the label hide under 40 px in pure CSS. Whatever the
 * label shows (a consumer shortens it as the strip narrows, and under 24 px it shows none), the full id
 * stays reachable in a tooltip (Thr-Shoot, JAVA-1301): hover, focus or a long press on touch.
 */

const STATE_CLASSES: Record<FilmstripState, string> = {
  received: "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)]",
  // Each state has a word AND a pattern, so a strip reads in grayscale: solid ink, hatched, dashed.
  pending:
    "border border-[color:var(--jd-control-border)] text-[color:var(--jd-muted)] " +
    "bg-[repeating-linear-gradient(45deg,transparent_0_6px,color-mix(in_oklab,var(--jd-ink)_10%,transparent)_6px_12px)]",
  gap: "border-2 border-dashed border-[color:var(--jd-danger)] text-[color:var(--jd-ink)]",
};

export interface FilmstripSegmentProps {
  segment: FilmstripSegment;
  size: "sm" | "lg";
  last: boolean;
  current: boolean;
  playing: boolean;
  /** Present when the strip is interactive: the segment is a button. */
  onSelect?: (id: string) => void;
  onFocusSegment?: (id: string) => void;
  tabIndex?: number;
  segmentRef?: (node: HTMLElement | null) => void;
}

export function FilmstripSegmentView({ segment, size, last, current, playing, onSelect, onFocusSegment, tabIndex, segmentRef }: FilmstripSegmentProps) {
  const interactive = Boolean(onSelect);
  const height = size === "lg" ? "h-14" : interactive ? "h-11" : "h-8";
  const box = cn(
    "flex min-w-0 flex-1 flex-row items-end overflow-hidden rounded-md pb-1",
    segment.state === "gap" ? "px-0.5" : "px-1.5",
    height,
    !last && "me-0.5",
    STATE_CLASSES[segment.state],
    // The dashed edge of a gap wins over the current border.
    current && segment.state !== "gap" && "border-2 border-[color:var(--jd-accent-mark)]",
    playing && "outline outline-2 outline-offset-2 outline-[color:var(--jd-accent-mark)]",
  );
  const label = (
    <Text font="kicker" className="truncate text-[10px]" aria-hidden="true">
      {segment.state === "gap" ? <strong className="me-1">GAP</strong> : null}
      <span className="@max-[40px]:hidden">{segment.label ?? segment.id}</span>
    </Text>
  );
  const common = {
    "data-state": segment.state,
    "data-segment-id": segment.id,
    ...(current ? { "aria-current": "true" as const } : {}),
  };

  return (
    <li role={interactive ? "none" : undefined} className="@container flex min-w-0 basis-0 flex-row" style={{ flexGrow: segment.seconds }}>
      <Tooltip label={segment.id}>
      {interactive ? (
        <button
          type="button"
          ref={segmentRef}
          tabIndex={tabIndex}
          aria-label={segmentName(segment)}
          onClick={() => onSelect?.(segment.id)}
          onFocus={() => onFocusSegment?.(segment.id)}
          className={cn(box, "cursor-pointer")}
          {...common}
        >
          {label}
        </button>
      ) : (
        <div ref={segmentRef} className={box} {...common}>
          {label}
          <span className="sr-only">{segmentName(segment)}</span>
        </div>
      )}
      </Tooltip>
    </li>
  );
}
