"use client";

import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import type { TheaterContextValue } from "../types";

/** What a key does to the Theater, or `false` for a key that is none of its business. */
function runStageKey(key: string, t: TheaterContextValue): boolean {
  switch (key) {
    case "ArrowRight":
      t.next();
      return true;
    case "ArrowLeft":
      t.prev();
      return true;
    case " ":
    case "Enter":
      t.toggle("keyboard");
      return true;
    case "Home":
      t.goTo(0);
      return true;
    case "End":
      t.goTo(t.count - 1);
      return true;
    default:
      return false;
  }
}

/**
 * What the stage does with the person's hands: hover (only if `pauseOnHover`), a press (reported,
 * and a pause only if `pauseOnInteract`), a click on a link (never navigates: the window says so),
 * and the keyboard. Returned as the props to spread on the stage element.
 */
export function useStageHandlers(
  t: TheaterContextValue,
  interactive: boolean,
  showLinkNote: () => void,
) {
  const onPointerEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (t.pauseOnHover && e.pointerType === "mouse") t.hold("hover");
  };
  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") t.release("hover");
  };
  const onPointerDownCapture = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest?.(".theater__note")) return; // these handle their own buttons
    if (interactive) t.interact();
  };
  // A link in the scene never navigates: the window says so and offers the app itself.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (target.closest?.(".theater__note")) return;
    const link = target.closest?.("a[href]");
    if (!link) return;
    e.preventDefault();
    e.stopPropagation();
    t.link(link.getAttribute("href") ?? "");
    showLinkNote();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return; // do not steal keys from the scene's inputs
    if (runStageKey(e.key, t)) e.preventDefault();
  };

  return {
    onPointerEnter,
    onPointerLeave,
    onPointerDownCapture,
    onClickCapture,
    onKeyDown,
  };
}
