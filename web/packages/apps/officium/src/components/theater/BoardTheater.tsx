"use client";

import { THEATER_LABELS_EN, Theater, type TheaterScene } from "@javadaba/ui";

import { BoardScene } from "./board-scene";
import { BOARD_CURSOR, BOARD_SCRIPT_MS } from "./use-board-autopilot";

const SCENES: TheaterScene[] = [
  {
    id: "board",
    route: "/app",
    title: "An agent and a person on the same board",
    component: BoardScene,
    duration: BOARD_SCRIPT_MS,
    cursor: BOARD_CURSOR,
    href: "/app",
  },
];

/** The board is a desktop layout: composed at desktop width and scaled, never reflowed. */
const VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 900, height: 1000 },
];

const LABELS = { ...THEATER_LABELS_EN, region: "Live demo of the Officium backlog board" };

/**
 * The product page's hero visual: the real board playing itself inside `@javadaba/ui`'s Theater.
 *
 * Interactive (user decision, 2026-09-15: "the user should be able to do this too"): the person's
 * pointer works on the real board while the agent's ghost cursor keeps going (the show goes on).
 * The cursor is on because it is the person's half of the story (`use-board-autopilot.ts`).
 * The desk takes Officium's accent from the Surface it sits in.
 */
export function BoardTheater() {
  return (
    <Theater
      scenes={SCENES}
      labels={LABELS}
      viewport={VIEWPORTS}
      minScale={0.4}
      cta={{ href: "/app", label: "Open Officium" }}
    />
  );
}
