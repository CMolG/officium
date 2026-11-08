"use client";

import { ICON_OPEN } from "../icons";
import { useTheater } from "../hooks/useTheater";

/** The way into the app, at the end of the bar. Painted only when the scene or `cta` has a link. */
export function TheaterOpen() {
  const { scene, cta, labels, open } = useTheater();
  const href = scene?.href ?? cta?.href;
  if (!href) return null;
  return (
    <a
      className="theater__open"
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => open(href)}
    >
      {cta?.label ?? labels.open}
      {ICON_OPEN}
    </a>
  );
}
