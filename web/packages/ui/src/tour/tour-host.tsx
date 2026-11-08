"use client";

import { RunningTour } from "./running-tour";
import { TOUR_LABELS_EN } from "./labels";
import { dismissFarewell, getTour, useTourState } from "./store";
import { TourFarewell } from "./tour-farewell";
import { useResumeStoppedTours } from "./use-tour";
import { useHostTours } from "./use-host-tours";

/**
 * Mount once per product, anywhere under its surface (its root layout). It draws whichever tour
 * `startTour` or `useAutoTour` started, and the line that closes it; with no tour running it draws
 * nothing. The tours themselves are registered with `defineTour`.
 */
export function TourHost() {
  useHostTours();
  const { tourId, index, direction, farewellFor } = useTourState();
  useResumeStoppedTours();
  const running = tourId ? getTour(tourId) : undefined;
  const farewell = farewellFor ? getTour(farewellFor) : undefined;
  return (
    <>
      {running && <RunningTour key={running.id} tour={running} index={index} direction={direction} />}
      {farewell && (
        <TourFarewell labels={farewell.labels ?? TOUR_LABELS_EN} lang={farewell.lang} onClose={dismissFarewell} />
      )}
    </>
  );
}
