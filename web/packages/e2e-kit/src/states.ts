/*
 * The state contract, forced from the outside.
 *
 * The five mandatory states (`rules/interface-psychology.md` §2) are only testable if the
 * test can PUT the app in them, and no surface here has a way to ask a real backend for "be
 * down now". `page.route` does: it intercepts before the request leaves the browser, so the
 * app's own fetch/SWR/React-Query path runs exactly as it would in production — only the answer
 * changes.
 *
 * Every helper returns its own un-route function so a single test can walk error → empty →
 * populated without leaking the interception into the next assertion.
 */
import type { Page, Route } from "@playwright/test";

import { pushInducedConsole } from "./fixtures";

/** Everything under the same-origin API proxy. The default target of all three helpers. */
export const API_GLOB = "**/api/**";

export type Unroute = () => Promise<void>;

async function install(
  page: Page,
  pattern: string,
  handler: (route: Route) => Promise<void>,
): Promise<Unroute> {
  await page.route(pattern, handler);
  return () => page.unroute(pattern, handler);
}

/**
 * API down → the ERROR state. Answers `503` with a JSON body, which is what a gateway failure
 * actually looks like to the app; `route.abort()` is a different failure (a network error) and
 * exercises a different branch, so it is a separate option rather than the default.
 */
export function forceApiDown(
  page: Page,
  pattern: string = API_GLOB,
  options: { status?: number; abort?: boolean } = {},
): Promise<Unroute> {
  const { status = 503, abort = false } = options;
  // The browser will log "Failed to load resource" for every answer this helper forces; that is
  // the induced condition, not the page's noise, and it is tolerated only while the route holds.
  const popInduced = pushInducedConsole(page, /Failed to load resource/);
  return install(page, pattern, async (route) => {
    if (abort) return route.abort("failed");
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({ error: "forced by e2e-kit forceApiDown" }),
    });
  }).then((unroute) => async () => {
    popInduced();
    await unroute();
  });
}

/**
 * An answer with nothing in it → the EMPTY state, which is the frequent one on most of these
 * surfaces and the one most often missing. `[]` by default; pass the shape the endpoint really
 * returns (`{ items: [], total: 0 }`, a cursor page, …) when a bare array would not parse.
 */
export function forceEmpty(
  page: Page,
  pattern: string = API_GLOB,
  body: unknown = [],
): Promise<Unroute> {
  return install(page, pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export type Held = Unroute & { release: () => void };

/**
 * A request held in flight → the LOADING state, for as long as the TEST decides. Nothing here
 * counts time: the request stays open until `release()`, then goes through untouched
 * (`route.fallback()`, so a more specific route installed later still wins), which lets the test
 * assert the transition loading → success too.
 *
 *   const held = await forceSlow(page, GLOB);
 *   ...assert the loading state...
 *   held.release();
 *   ...assert what comes after...
 *
 * It used to hold for a fixed `ms` (2.5–3s per caller). That was a guess on both sides — long
 * enough to observe on a loaded machine, short enough not to hurt — and it was paid in full on
 * every run (`.harness/rules/fast-tests.md`). Releasing on the assertion is exact and free.
 */
export function forceSlow(page: Page, pattern: string = API_GLOB): Promise<Held> {
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  return install(page, pattern, async (route) => {
    await hold;
    await route.fallback();
  }).then((unroute) => Object.assign(unroute, { release }));
}
