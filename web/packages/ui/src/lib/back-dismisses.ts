"use client";

import { useCallback, useEffect, useRef } from "react";
import { addBasePath } from "next/dist/client/add-base-path";

/*
 * Back closes a full-screen sheet instead of leaving the page (JAVA-224).
 *
 * Below `sm` a dialog is the whole screen (JAVA-59): there is no scrim to press, a phone has no
 * Escape key, and Back -- the one exit every phone user reaches for -- left the PAGE with the
 * sheet still open on it. Leaving has to cost what entering did (interface-psychology #6).
 */

const KEY = "__jdBackLayers";
/** The sheet's own breakpoint: `DialogContent`'s `max-sm:` shape. */
const SHEET_QUERY = "(max-width: 639.98px)";

/** An address a layer carries while it is open (JAVA-1417); both are app routes, without the basePath. */
export type LayerAddress = { path: string; under: string };

function layersOf(state: unknown): string[] {
  const layers = state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : undefined;
  return Array.isArray(layers) ? (layers as string[]) : [];
}

/**
 * While `active` -- and only where the layer is a phone sheet -- holds one history entry, and a
 * Back that pops it dismisses the top layer the way Escape does. Escape on purpose: it runs each
 * dialog's own guard (`TaskModal` keeps an unsaved edit and says so), and it reaches only the
 * TOPMOST layer, so a menu open inside the dialog closes first. When the layer stays open after
 * it, the entry is taken again, so the next Back still has something to close.
 *
 * Returns `dismissed()`, for when the PERSON closed the layer (its close control, Escape, a
 * press outside): the close then steps back over the entry. A close from the layer's own code
 * (Save, Cancel, a button that navigates next) only strips the marker instead, because Next
 * DISCARDS a pending `router.push` when a history restore lands (`app-router-instance.js`,
 * `ACTION_RESTORE`): stepping back there would cancel the navigation the button started. The
 * price is that one Back after such a close stays on the same page.
 *
 * With an `address` (JAVA-1417) the layer also owns the address bar: it holds at every width, not
 * only on a phone sheet, and the entry it pushes is `address.path`, one step above `address.under`.
 * A page opened ON that path (typed, shared, reloaded) first has its entry replaced with `under`, so
 * Back from the card lands on its board instead of leaving the app. A new `path` while it holds is
 * replaced in place; a release by code while its entry is on top goes back to `under`.
 *
 * Entries are pushed on top of Next's own state (`__NA`, its tree), so its `popstate` handler
 * restores the same page instead of reloading it.
 */
export function useBackDismisses(active: boolean, address?: LayerAddress): () => void {
  const dismissedByPerson = useRef(false);
  const followRef = useRef<(() => void) | null>(null);
  const addressRef = useRef(address);
  addressRef.current = address;
  const hasAddress = address !== undefined;
  const path = address?.path;

  useEffect(() => {
    const onSheet = typeof window.matchMedia === "function" && window.matchMedia(SHEET_QUERY).matches;
    if (!active || !(hasAddress || onSheet)) return;
    const token = Math.random().toString(36).slice(2);
    let held = false;
    let closed = false;
    dismissedByPerson.current = false;

    const hold = () => {
      const state = window.history.state as Record<string, unknown> | null;
      const where = addressRef.current;
      if (where && window.location.pathname === addBasePath(where.path)) {
        const layers = layersOf(state);
        if (layers.length > 0) {
          // An entry a layer already owns (Forward, Back from a page the card linked to): adopt it.
          window.history.replaceState({ ...state, [KEY]: [...layers.slice(0, -1), token] }, "");
          held = true;
          return;
        }
        window.history.replaceState(state, "", addBasePath(where.under));
      }
      window.history.pushState({ ...state, [KEY]: [...layersOf(state), token] }, "", where ? addBasePath(where.path) : undefined);
      held = true;
    };
    const onPopState = (event: PopStateEvent) => {
      if (!held || layersOf(event.state).includes(token)) return;
      held = false;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
      // The Escape's update is a discrete one and has committed by the next task: still open
      // means something inside kept it (a guard, a menu that took the Escape).
      window.setTimeout(() => {
        if (!closed) hold();
      }, 0);
    };

    const follow = () => {
      // A new path while holding (another card opened from inside the dialog): replace in place.
      const where = addressRef.current;
      if (held && where && window.location.pathname !== addBasePath(where.path))
        window.history.replaceState(window.history.state, "", addBasePath(where.path));
    };

    hold();
    followRef.current = follow;
    window.addEventListener("popstate", onPopState);
    return () => {
      closed = true;
      window.removeEventListener("popstate", onPopState);
      if (!held) return;
      const state = window.history.state as Record<string, unknown> | null;
      const layers = layersOf(state);
      // Anything else on top -- a navigation that already landed, a layer above -- is not ours.
      if (layers.at(-1) !== token) return;
      if (dismissedByPerson.current) window.history.back();
      else {
        const where = addressRef.current;
        window.history.replaceState({ ...state, [KEY]: layers.slice(0, -1) }, "", where ? addBasePath(where.under) : undefined);
      }
    };
  }, [active, hasAddress]);

  useEffect(() => {
    followRef.current?.();
  }, [path]);

  return useCallback(() => {
    dismissedByPerson.current = true;
  }, []);
}
