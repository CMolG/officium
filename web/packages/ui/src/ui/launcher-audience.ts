"use client";

import { useSyncExternalStore } from "react";

import { listedForViewer, type Viewer } from "@javadaba/brand";

import type { ProductAppLink } from "./javadaba-links";

/*
 * Who may see the B2C apps in a launcher: the one filter every menu goes through (JAVA-2032).
 *
 * B2C products get no link, card, scene or name for a visitor (product-direction, platform-wide).
 * `JAVADABA_APPS` stays the one full list and `listedForViewer` (`@javadaba/brand`) the one rule of
 * audience, including the B2C app a signed-in member is shown (Album, JAVA-2053). This package cannot
 * read the session (`@javadaba/account` depends on it), so the account hook tells it the viewer, once
 * its first read has resolved: until then, and on the server, the answer is "visitor". It fails
 * closed, like the landing's gate.
 */
let viewer: Viewer = "visitor";
const listeners = new Set<() => void>();

/** Called by the session hook when the session resolves; a pending session never calls it. */
export function setLauncherViewer(next: Viewer): void {
  if (next === viewer) return;
  viewer = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The apps a viewer sees: everything for an admin, no B2C product for anyone else but the ones shown to members.
 * The one exception is the product `current` names: a visitor already inside it sees it, marked as
 * the page they are on, because hiding an app from its own menu helps nobody and is no link to
 * another B2C product.
 */
export function visibleApps(
  apps: readonly ProductAppLink[],
  who: Viewer,
  current?: string,
): readonly ProductAppLink[] {
  return apps.filter((app) => app.slug === current || listedForViewer(app.slug, who));
}

/** `apps` filtered for the session this tab holds. */
export function useVisibleApps(apps: readonly ProductAppLink[], current?: string): readonly ProductAppLink[] {
  const who = useSyncExternalStore(subscribe, () => viewer, (): Viewer => "visitor");
  return visibleApps(apps, who, current);
}
