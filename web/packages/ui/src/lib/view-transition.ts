"use client";

import { flushSync } from "react-dom";

/*
 * Promoted from Sonus (`packages/apps/sonus/src/logic/view-transition.ts`) on 2026-09-22, when
 * the motion contract (`doc://contracts/design-system/motion`) made view transitions
 * the ecosystem's tool for layout changes and shared elements. The landing had a second copy
 * inside `ViewTransitionLink` that carried none of the three guards below — it animated under
 * `prefers-reduced-motion` and left `ready` unhandled — which is how one concern ends up with
 * two behaviours.
 */

/**
 * What the browser hands back. Only the promises matter here, and only one of them is read:
 * `ready` is the one that REJECTS when the transition never happens.
 */
interface ViewTransitionLike {
  ready?: Promise<void>;
  finished?: Promise<void>;
}

type WithViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionLike;
};

/**
 * Applies a React state change inside a browser **view transition**.
 *
 * It is the system's answer to two of the six motion jobs, with no library: a list that
 * reorders or filters (every item carrying its own `view-transition-name` slides to its new
 * place — FLIP, computed by the browser and played on the compositor), and an element that
 * morphs between two views (a thumbnail and its detail share one name).
 *
 * <h2>Why the `flushSync` is needed</h2>
 * `startViewTransition` snapshots the DOM, runs the callback, snapshots it again, and animates
 * between the two. React batches updates and applies them AFTER the callback, so without
 * `flushSync` both snapshots are identical and nothing animates: the transition "works" and
 * shows nothing. It's the classic mistake with this API and it gives no warning.
 *
 * <h2>And why it can be skipped</h2>
 * <ul>
 *   <li><b>`prefers-reduced-motion`.</b> A whole-view transition is large motion, and whoever
 *       asks for less motion is asking for exactly this
 *       (`.harness/rules/interface-psychology.md` #5). The view still changes, just without
 *       animating.</li>
 *   <li><b>No support.</b> Without it the view just changes: functionality doesn't depend on
 *       the animation, which is how it should be.</li>
 * </ul>
 */
export function withViewTransition(change: () => void): void {
  const doc = typeof document === "undefined" ? null : (document as WithViewTransitionDocument);
  const reducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /*
   * A HIDDEN document cannot animate, and the browser says so by rejecting ([[JDB-164]]).
   *
   * Called with `document.visibilityState === 'hidden'` -- a backgrounded tab, a window behind
   * another one, the moment before a navigation commits -- Chrome skips the transition and
   * rejects `ready` with `InvalidStateError: Transition was aborted because of invalid state`.
   * Nothing held that promise, so it surfaced as an `unhandledrejection`, and the apps report
   * those: three of the first five `error_client` rows the platform ever recorded were this
   * exact string, on /sonus and /sonus/app within two minutes of each other.
   *
   * It was never a malfunction -- the view changed correctly every time -- which is the worst
   * kind of entry in an error stream: it teaches whoever reads it that the stream is noise.
   */
  const hidden = doc?.visibilityState === "hidden";
  if (!doc?.startViewTransition || reducedMotion || hidden) {
    change();
    return;
  }
  const transition = doc.startViewTransition(() => flushSync(change));
  /*
   * And the belt for the case the guard above cannot see: the document can go hidden BETWEEN
   * this call and the transition starting, and a second transition supersedes a running one
   * (`AbortError`). Both are normal outcomes, both reject `ready`, and neither is an error.
   *
   * ONLY `ready`. `finished` and `updateCallbackDone` reject when the update callback itself
   * throws -- a real exception inside `change()` -- and swallowing those would hide the one
   * failure worth reporting.
   */
  transition?.ready?.catch(() => {});
}
