"use client";

import dynamic from "next/dynamic";
import { deferUntilNear } from "@javadaba/ui";

/**
 * A section's walkthrough, loaded and mounted only once it is within a screen of the viewport
 * (JAVA-1639: six Theaters and their scenes in the first load was the page's extra main-thread
 * work). The frame's code is its own chunk, and the placeholder holds the frame's space at its two
 * sizes, so the frame arriving moves nothing. The placeholder is already the walkthrough's region,
 * so the landmark is in the DOM for screen readers and crawlers before the frame mounts.
 */
export const SectionTheater = deferUntilNear(
  dynamic(() => import("./SectionFrame").then((m) => m.SectionFrame), { ssr: false }),
  "aspect-[1120/700] max-sm:aspect-[360/640] w-full",
  ({ region }) => ({ role: "region", "aria-label": region, "data-playing": "false" }),
);
