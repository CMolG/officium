/*
 * Waiting for a Next page to hydrate.
 *
 * `page.goto` resolves at DOMContentLoaded (or `load`), when the server's HTML is on screen and React has
 * not attached a single handler yet. A click made in that gap lands on markup nobody listens to and is
 * lost, so the spec fails on a button that is plainly there: the whole class of "click before hydration"
 * flakes the Oleum mixer, the Cibus Iter search and the landing's Useful and legal-sheet specs all hit
 * under load. `waitForHydration` closes the gap once, for every suite, instead of each spec retrying its
 * own click.
 *
 * The signal is React's own: `hydrateRoot(document, ...)` marks `document` with a `__reactContainer$…`
 * key, and Next's App Router pages carry `self.__next_f` (the flight data). A document that is not one of
 * those (a JSON or XML answer, a static asset, a Pages Router page) has nothing to wait for and returns at
 * once. A page that never hydrates is the spec's own failure to report, so a timeout here is swallowed and
 * the spec's next assertion says what is wrong.
 */
import type { Page } from "@playwright/test";

/** Resolves when the page's React root has been created, then after two frames more. */
export async function waitForHydration(page: Page, timeout = 5_000): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const next = (self as unknown as { __next_f?: unknown }).__next_f;
        if (document.contentType !== "text/html" || next === undefined) return true;
        return Object.keys(document).some((key) => key.startsWith("__reactContainer$"));
      },
      undefined,
      { timeout },
    );
    // The root exists from the moment hydration starts; the handlers of the first screen follow within a
    // frame or two. Two frames cover that without a fixed sleep.
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );
  } catch {
    // Closed page, navigation in flight, or a page that never hydrates: the caller's own assertion reports it.
  }
}
