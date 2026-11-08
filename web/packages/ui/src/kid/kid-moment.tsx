"use client";

import { useEffect, useState } from "react";
import { Doodle } from "@javadaba/brand/doodles";
import { onDismissKey } from "@javadaba/sdk/platform";

import { cn } from "../lib/cn";
import { Link } from "../navigation";
import { Button } from "../ui/button";
import { Glyph } from "../ui/glyph";
import { Text } from "../ui/text";
import { useKidMoment, kidMoments } from "./store";

/** Reading time before the card leaves on its own; never while the pointer or focus is on it. */
const STAYS_MS = 7_000;

/**
 * The Kid moment (canvas board 22): the kid on a plain surface, a title, one line with real names, at most one
 * action, and Close. Bottom right on a large screen, over nothing it talks about; a sheet at the bottom on a phone.
 * Read once as a polite status; focus stays where it was; Escape or Close sends it away; with reduced motion it
 * appears without rising. Nothing to win: it never costs or gives money or points.
 */
export function KidMomentHost({ closeLabel }: { closeLabel: string }) {
  const moment = useKidMoment();
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!moment || held) return;
    const timer = setTimeout(() => kidMoments.close(), STAYS_MS);
    return () => clearTimeout(timer);
  }, [moment, held]);
  useEffect(() => (moment ? onDismissKey(() => kidMoments.close()) : undefined), [moment]);
  if (!moment) return null;
  const { action } = moment;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed z-40 flex flex-row items-start gap-3.5 rounded-2xl border border-[color:var(--jd-line)] bg-[color:var(--jd-page)] p-4 shadow-lg",
        "inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]",
        "motion-safe:animate-jd-sheet-in",
      )}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <Doodle name={moment.pose} size={72} decorative className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Text weight="bold" className="text-[15px]">
          {moment.title}
        </Text>
        <Text size="sm" tone="muted">
          {moment.line}
        </Text>
        {action && (
          <span className="pt-1.5">
            {action.href ? (
              <Button asChild register="ui" size="sm" variant="outline">
                <Link href={action.href} onClick={() => kidMoments.close()}>
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                register="ui"
                size="sm"
                variant="outline"
                onClick={() => {
                  kidMoments.close();
                  action.onSelect?.();
                }}
              >
                {action.label}
              </Button>
            )}
          </span>
        )}
      </span>
      <button type="button" aria-label={closeLabel} onClick={() => kidMoments.close()} className="flex size-11 shrink-0 cursor-pointer flex-row items-center justify-center rounded-lg border-0 bg-transparent text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-ink)]/5">
        <Glyph name="x" size={16} />
      </button>
    </div>
  );
}
