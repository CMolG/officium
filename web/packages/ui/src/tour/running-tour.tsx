"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { focusedElement } from "@javadaba/sdk/platform";

import { PHONE_MAX_WIDTH } from "./placement";
import { endTour, nextTourStep, prevTourStep } from "./store";
import { TourSpotlight } from "./tour-spotlight";
import { TourStepCard } from "./tour-step-card";
import { useTourTarget } from "./use-target";
import { useViewport } from "./use-viewport";
import type { TourDefinition } from "./types";

const FOCUSABLE = "button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

/** Whether Enter would already do something where focus is. */
function activates(element: EventTarget | null): boolean {
  return element instanceof Element && element.closest("button, a[href], input, select, textarea") !== null;
}

/**
 * Keyboard (Library 15 § Behavior): Enter or the right arrow for Next, the left arrow for Back, Esc
 * to end, and Tab stays inside the card.
 */
function onKeyDown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    endTour();
    return;
  }
  const card = document.querySelector<HTMLElement>("[data-jd-tour-card]");
  if (event.key === "ArrowRight" || (event.key === "Enter" && !activates(event.target))) {
    event.preventDefault();
    nextTourStep();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    prevTourStep();
  } else if (event.key === "Tab" && card) {
    const items = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const inside = card.contains(document.activeElement);
    if (!inside || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}

interface RunningTourProps {
  tour: TourDefinition;
  index: number;
  direction: 1 | -1;
}

/**
 * The tour on screen: the spotlight, the card, the keyboard, and where focus goes back to. A step
 * for a part a phone does not show is skipped on a phone, in the direction the person was going.
 */
export function RunningTour({ tour, index, direction }: RunningTourProps) {
  const viewport = useViewport();
  const step = tour.steps[index];
  const target = useTourTarget(step, `${tour.id}:${index}`);
  const phone = viewport.width > 0 && viewport.width < PHONE_MAX_WIDTH;
  const skipped = Boolean(step?.hiddenOnPhone && phone);

  useEffect(() => {
    const origin = focusedElement();
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!skipped) return;
    if (direction === -1 && index > 0) prevTourStep();
    else nextTourStep();
  }, [skipped, direction, index]);

  if (!step || skipped) return null;
  // Drawn at the body, so no stacking context of where the product mounts the host (a transformed or
  // z-indexed ancestor) can sink the spotlight under the page it covers.
  return createPortal(
    <div data-jd-tour="" className="contents">
      <TourSpotlight box={target.box} interactive={Boolean(step.tryIt)} />
      <TourStepCard
        key={index}
        tour={tour}
        step={step}
        index={index}
        box={target.box}
        name={target.name}
        viewport={viewport}
      />
    </div>,
    document.body,
  );
}
