"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "../lib/cn";
import { PHONE_MAX_WIDTH, placeCard, type Box, type Size } from "./placement";
import { advanceTour, endTour, nextTourStep, prevTourStep } from "./store";
import { TourCard } from "./tour-card";
import type { TourDefinition, TourStep } from "./types";

/** A moment to show the tick before the tour moves on by itself. */
const TRIED_PAUSE_MS = 500;

interface TourStepCardProps {
  tour: TourDefinition;
  step: TourStep;
  index: number;
  box: Box | null;
  name: string | null;
  viewport: Size;
}

/** The corner a side placement pins the card to, or the middle when nothing is lit. */
function floatingStyle(placement: ReturnType<typeof placeCard> | null): CSSProperties {
  if (!placement) return { position: "fixed", left: 0, top: 0, visibility: "hidden" };
  if (placement.mode === "side") return { position: "fixed", left: placement.left, top: placement.top };
  return { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
}

/**
 * One step's card: measured, placed around the lit part, focused, and listening for the action the
 * step asked for. Keyed by the step, so what it remembers (the action was done) starts over.
 */
export function TourStepCard({ tour, step, index, box, name, viewport }: TourStepCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [tried, setTried] = useState(false);
  const sheet = viewport.width > 0 && viewport.width < PHONE_MAX_WIDTH;

  useLayoutEffect(() => {
    const card = ref.current;
    if (card) setSize({ width: card.offsetWidth, height: card.offsetHeight });
  }, [step, sheet]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-jd-tour-next]")?.focus({ preventScroll: true });
  }, []);

  const on = step.tryIt?.on;
  useEffect(() => {
    if (!on) return;
    let pause: ReturnType<typeof setTimeout> | undefined;
    const heard = (event: Event) => {
      const scope = on.within ?? step.target;
      const from = event.target instanceof Element ? event.target : null;
      if (scope && !from?.closest(scope)) return;
      setTried(true);
      pause = setTimeout(() => advanceTour(step.id ?? String(index)), TRIED_PAUSE_MS);
    };
    document.addEventListener(on.event, heard, true);
    return () => {
      document.removeEventListener(on.event, heard, true);
      clearTimeout(pause);
    };
  }, [on, step.id, step.target, index]);

  const placement = size && viewport.width > 0 ? placeCard({ target: box, card: size, viewport, preferred: step.placement }) : null;

  return (
    <TourCard
      ref={ref}
      tour={tour}
      step={step}
      index={index}
      total={tour.steps.length}
      tried={tried}
      highlightedName={name}
      variant={sheet ? "sheet" : "card"}
      onBack={prevTourStep}
      onNext={nextTourStep}
      onEnd={endTour}
      style={sheet ? undefined : floatingStyle(placement)}
      className={cn("z-[201]", sheet && "fixed inset-x-2 bottom-2")}
    />
  );
}
