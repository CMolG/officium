"use client";

import { WINDOW_CONTROLS } from "../icons";
import { useTheater } from "../hooks/useTheater";

/** The title row of a Javadaba OS window: seal, title and the window controls, drawn but inert. No browser bar, no address. */
export function WindowTitleBar() {
  const { scene, product, labels } = useTheater();
  const title =
    [product?.name, scene?.title].filter(Boolean).join(" · ") ||
    labels.windowTitleFallback;
  return (
    <div className="theater__titlebar">
      <span>
        {product?.icon}
        <span>{title}</span>
      </span>
      <span className="theater__dots" aria-hidden="true">
        {WINDOW_CONTROLS.map((icon, i) => (
          <span key={i}>{icon}</span>
        ))}
      </span>
    </div>
  );
}
