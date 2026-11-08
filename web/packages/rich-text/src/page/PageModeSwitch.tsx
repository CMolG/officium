"use client";

export type PageMode = "visual" | "source" | "read";

export interface PageModeSwitchProps {
  mode: PageMode;
  onChange: (mode: PageMode) => void;
  /** Read is offered only when the host can draw the page (`readView`). */
  canRead: boolean;
  /** Why Visual rests, when the visual editor cannot keep this page exactly. */
  visualUnavailable?: string;
}

const SEGMENT =
  "min-h-8 cursor-pointer rounded-full px-3 text-xs font-semibold text-[color:var(--jd-muted)] transition-colors " +
  "hover:text-[color:var(--jd-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)] " +
  "aria-pressed:bg-[color:var(--jd-raised)] aria-pressed:text-[color:var(--jd-ink)] aria-pressed:shadow-[0_1px_2px_rgba(17,17,17,0.08)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11";

/**
 * The page's modes, in the slim bar (Lib-RichText 12 "Mode"): Visual, Markdown and Read. The one on is
 * pressed, which is a fill and a weight as well as a color. The Markdown segment keeps its long name
 * ("Markdown source") because the word alone does not say what it opens; its visible text is the design's.
 */
export function PageModeSwitch({ mode, onChange, canRead, visualUnavailable }: PageModeSwitchProps) {
  const segments: Array<{ id: PageMode; text: string; name: string; reason?: string }> = [
    { id: "visual", text: "Visual", name: "Visual", reason: visualUnavailable },
    { id: "source", text: "Markdown", name: "Markdown source" },
    ...(canRead ? [{ id: "read" as const, text: "Read", name: "Read" }] : []),
  ];
  return (
    <div role="group" aria-label="Mode" className="flex flex-row gap-0.5 rounded-full bg-[color:var(--jd-card)] p-0.5">
      {segments.map((segment) => (
        <button
          key={segment.id}
          type="button"
          className={SEGMENT}
          aria-pressed={mode === segment.id}
          aria-label={segment.reason ? `${segment.name}, ${segment.reason.charAt(0).toLowerCase()}${segment.reason.slice(1)}` : segment.name}
          title={segment.reason}
          disabled={Boolean(segment.reason)}
          onClick={() => onChange(segment.id)}
        >
          {segment.text}
        </button>
      ))}
    </div>
  );
}
