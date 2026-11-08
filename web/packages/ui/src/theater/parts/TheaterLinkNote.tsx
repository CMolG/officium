"use client";

import { ICON_INFO, ICON_OPEN } from "../icons";
import { useTheater } from "../hooks/useTheater";

/**
 * What a pressed link in the scene says, inside the window: nothing navigates, and the app itself
 * is one press away. Goes inside Stage; the Stage decides when it shows (four seconds).
 */
export function TheaterLinkNote() {
  const { scene, cta, labels, open } = useTheater();
  const href = scene?.href ?? cta?.href;
  return (
    <span className="theater__note" role="status">
      {ICON_INFO}
      <span>{labels.linkNote}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={() => open(href)}
        >
          {cta?.label ?? labels.open}
          {ICON_OPEN}
        </a>
      ) : null}
    </span>
  );
}
