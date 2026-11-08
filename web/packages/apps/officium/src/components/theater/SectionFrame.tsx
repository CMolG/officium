"use client";

import { THEATER_LABELS_EN, Theater } from "@javadaba/ui";

import { SECTION_SCENES, type SectionSceneId } from "./section-scenes";

/** Composed at the frame's two sizes: the copy sits above, the frame takes the full column. */
const VIEWPORTS = [
  { width: 1120, height: 700 },
  { width: 360, height: 640 },
];

/**
 * One section's walkthrough frame: ONE scene in its own Theater, looping on its own script. The
 * key is what crosses from the server page, never a function: scenes are chosen from
 * `section-scenes.ts`, so the page stays a plain composition. Mounted by `SectionTheater`, which
 * waits for the frame to come near the viewport.
 */
export function SectionFrame({ scene, region }: { scene: SectionSceneId; region: string }) {
  return (
    <Theater
      scenes={[SECTION_SCENES[scene]]}
      labels={{ ...THEATER_LABELS_EN, region }}
      viewport={VIEWPORTS}
      minScale={0.4}
      cta={{ href: "/app", label: "Open Officium" }}
    />
  );
}
