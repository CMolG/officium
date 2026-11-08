"use client";

import { useState } from "react";

import { cn } from "../lib/cn";
import { InlineLink } from "../ui/inline-link";
import { toast } from "../ui/toast";
import { useAnimations } from "./animations";

export interface AnimationsSwitchLabels {
  on: string;
  paused: string;
  pausedBySystem: string;
  pause: string;
  play: string;
  /** The buttons' accessible names: the action alone is not enough out of context. */
  pauseLabel: string;
  playLabel: string;
  /** Said once, politely, to screen readers when the person pauses. */
  announcePaused: string;
  announcePlaying: string;
}

export const ANIMATIONS_LABELS_EN: AnimationsSwitchLabels = {
  on: "Animations: on",
  paused: "Animations: paused",
  pausedBySystem: "Animations: paused by your system",
  pause: "Pause",
  play: "Play",
  pauseLabel: "Pause animations",
  playLabel: "Play animations",
  announcePaused: "Animations paused on Javadaba",
  announcePlaying: "Animations playing on Javadaba",
};

export interface AnimationsSwitchProps {
  /** "inline" is the large-screen footer (state, then the action); "compact" is one line among the legal links. */
  layout?: "inline" | "compact";
  labels?: Partial<AnimationsSwitchLabels>;
  className?: string;
}

/**
 * The footer's Pause animations line, next to Analytics, in the same words: the state, then what
 * pressing does. One switch for the whole site (`useAnimations`); no Theater, field or doodle
 * has a control of its own. It never moves focus; the change is said once to screen readers and in a
 * short toast (a page without a `ToastViewport` simply shows no toast).
 */
export function AnimationsSwitch({ layout = "inline", labels, className }: AnimationsSwitchProps) {
  const { paused, source, set } = useAnimations();
  const words = { ...ANIMATIONS_LABELS_EN, ...labels };
  const [announcement, setAnnouncement] = useState("");
  const state = !paused ? words.on : source === "system" ? words.pausedBySystem : words.paused;
  const action = paused ? words.play : words.pause;
  const label = paused ? words.playLabel : words.pauseLabel;
  const toggle = () => {
    const said = paused ? words.announcePlaying : words.announcePaused;
    setAnnouncement(said);
    // "Said once, politely": the status above is for screen readers, and a short toast (it never takes focus) is for everyone.
    toast.info(said, { id: "jd-animations", duration: 3000 });
    set(!paused);
  };

  return (
    <span className={cn("inline-flex flex-row items-center gap-2 text-[13px]", className)} data-jd-component="AnimationsSwitch">
      {layout === "inline" ? (
        <>
          <span className="text-[color:var(--jd-muted)]">{state}</span>
          <InlineLink asChild>
            <button type="button" onClick={toggle} aria-label={label}>
              {action}
            </button>
          </InlineLink>
        </>
      ) : (
        <InlineLink asChild>
          <button type="button" onClick={toggle} aria-label={label}>
            <span>{`${state} · ${action}`}</span>
          </button>
        </InlineLink>
      )}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </span>
  );
}
