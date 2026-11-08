import dynamic from "next/dynamic";
import { deferUntilNear, type TheaterScene } from "@javadaba/ui";

import { CONNECT_ROUTE, CONNECT_SCRIPT_MS } from "./connect-script";
import { CONTRIBUTIONS_CURSOR, CONTRIBUTIONS_ROUTE, CONTRIBUTIONS_SCRIPT_MS } from "./contributions-script";
import { EXPORT_CURSOR, EXPORT_ROUTE, EXPORT_SCRIPT_MS } from "./export-script";
import { PLAN_CURSOR, PLAN_SCRIPT_MS } from "./plan-script";
import { ROLES_CURSOR, ROLES_ROUTE, ROLES_SCRIPT_MS } from "./roles-script";
import { ROOM_SCRIPT_MS } from "./room-script";

/**
 * The six area walkthroughs of the Rule of Seven page (JAVA-1639), keyed by the section that
 * plays them. Each section mounts exactly one of these, never several chained in one Theater
 * (owner, 2026-10-06, JAVA-950). Each scene loads on its own chunk and mounts only near the
 * viewport (`deferUntilNear`), so a section below the fold does not put its scripts in the first load.
 */
export const SECTION_SCENE_IDS = ["plan", "roles", "connect", "cost", "room", "export"] as const;

export type SectionSceneId = (typeof SECTION_SCENE_IDS)[number];

/** The plan and room scripts name no route of their own: they play from the app root. */
const PLAN_ROUTE = "/officium/app";
const ROOM_ROUTE = "/officium/app";

export const SECTION_SCENES: Record<SectionSceneId, TheaterScene> = {
  plan: {
    id: "plan",
    route: PLAN_ROUTE,
    title: "Plan first",
    component: deferUntilNear(dynamic(() => import("./plan-scene").then((m) => m.PlanScene), { ssr: false })),
    duration: PLAN_SCRIPT_MS,
    cursor: PLAN_CURSOR,
    href: "/app",
  },
  roles: {
    id: "roles",
    route: ROLES_ROUTE,
    title: "Which AI works each card",
    component: deferUntilNear(dynamic(() => import("./roles-scene").then((m) => m.RolesScene), { ssr: false })),
    duration: ROLES_SCRIPT_MS,
    cursor: ROLES_CURSOR,
    href: "/app",
  },
  connect: {
    id: "connect",
    route: CONNECT_ROUTE,
    title: "One connection",
    component: deferUntilNear(dynamic(() => import("./connect-scene").then((m) => m.ConnectScene), { ssr: false })),
    duration: CONNECT_SCRIPT_MS,
    href: "/app",
  },
  cost: {
    id: "cost",
    route: CONTRIBUTIONS_ROUTE,
    title: "What each card cost",
    component: deferUntilNear(dynamic(() => import("./contributions-scene").then((m) => m.ContributionsScene), { ssr: false })),
    duration: CONTRIBUTIONS_SCRIPT_MS,
    cursor: CONTRIBUTIONS_CURSOR,
    href: "/app",
  },
  room: {
    id: "room",
    route: ROOM_ROUTE,
    title: "Room, not seats",
    component: deferUntilNear(dynamic(() => import("./room-scene").then((m) => m.RoomScene), { ssr: false })),
    duration: ROOM_SCRIPT_MS,
    href: "/app",
  },
  export: {
    id: "export",
    route: EXPORT_ROUTE,
    title: "Leave with every card",
    component: deferUntilNear(dynamic(() => import("./export-scene").then((m) => m.ExportScene), { ssr: false })),
    duration: EXPORT_SCRIPT_MS,
    cursor: EXPORT_CURSOR,
    href: "/app",
  },
};
