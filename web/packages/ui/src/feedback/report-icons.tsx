import type { FeedbackKind } from "./submit";

/** The two rows every menu ends with draw a shape (Lib-Feedback): a flag for a problem, a bulb for a suggestion. 16 px, `currentColor`. */
export function ReportIcon({ kind }: { kind: FeedbackKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {kind === "problem" ? (
        <>
          <path d="M4 22V4" />
          <path d="M4 4h13l-2 4 2 4H4" />
        </>
      ) : (
        <>
          <path d="M9 18h6M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        </>
      )}
    </svg>
  );
}
