"use client";

import { useEffect } from "react";

import { cn } from "../lib/cn";
import type { TourLabels } from "./types";

/** How long the closing line stays before it leaves by itself. */
const FAREWELL_MS = 9000;

/**
 * The line that closes a tour: where to find it again, with a way to close it. A status, not an
 * alert: it does not take focus and leaves by itself.
 */
export function TourFarewell({
  labels,
  lang,
  onClose,
  inline = false,
}: {
  labels: TourLabels;
  lang?: string;
  onClose: () => void;
  /** Drawn in the flow (the gallery) instead of docked to the screen. */
  inline?: boolean;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, FAREWELL_MS);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      role="status"
      lang={lang}
      data-jd-component="TourFarewell"
      className={cn(
        "flex w-fit max-w-[calc(100vw-2rem)] flex-row items-center gap-3 rounded-[14px] bg-[color:var(--jd-ink)] px-3.5 py-3 text-[13px] text-[color:var(--jd-page)] shadow-[var(--jd-shadow-overlay)]",
        inline ? "relative" : "fixed inset-x-4 bottom-4 z-[210] mx-auto animate-jd-sheet-in motion-reduce:animate-none",
      )}
    >
      <span>{labels.farewell}</span>
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer rounded-md bg-transparent px-1 text-[13px] font-semibold text-inherit underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-page)]"
      >
        {labels.closeFarewell}
      </button>
    </div>
  );
}
