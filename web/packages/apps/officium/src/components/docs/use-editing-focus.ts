"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

/** How long editing lasts after the focus leaves, so a click on a toolbar does not flip the avatar. */
const HOLD_MS = 30_000;

/** The title field or the text: where a caret is, which a navigation would take away (JAVA-792). */
const typesInto = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea"));

/**
 * Whether the focus is in the page's title or text (JAVA-796), for presence's `editing` (JAVA-802).
 * It holds for 30 s after the focus leaves, the way an avatar should not blink when the person
 * reaches for the toolbar or another window and comes back.
 */
export function useEditingFocus() {
  const [within, setWithin] = useState(false);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return {
    within,
    /** A caret in the title or the text right now, with no hold: what keeps a moved page's address (JAVA-792). */
    typing,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (timer.current) clearTimeout(timer.current);
      setWithin(true);
      setTyping(typesInto(event.target));
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!typesInto(event.relatedTarget)) setTyping(false);
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setWithin(false), HOLD_MS);
    },
  };
}
