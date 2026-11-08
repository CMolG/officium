import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/*
 * TheaterAmbient — the stage: the canvas, the light that comes off the content, and the
 * veil that keeps it legible.
 *
 * Promoted from **Sonus's theater mode** (`views/TheaterView.tsx`), which is one of the
 * best ideas in the tree and was trapped in a 478-line file where the cover art color
 * extractor, the WebGL visualizer, the lyrics reader, and the stage were all the same
 * thing.
 *
 * What gets promoted is **the stage, and only the stage**. What does NOT get promoted,
 * on purpose, is everything that makes Sonus Sonus: the ferrofluid visualizer, the CRT
 * scanlines, the vignette. That's its specialization and it stays where it is.
 *
 * ## The veil isn't optional, and it's the reason this is a component
 *
 * The ambient light comes from the CONTENT —a cover, an artwork—, so it can't be chosen:
 * tomorrow's image might be nearly white and leave the text at 2:1. The veil is a
 * gradient of the surface color laid over the ambient light, and it guarantees the ink
 * stays legible no matter what comes through.
 *
 * Without it, a theater is a random contrast-failure generator. It's exactly the piece
 * that gets forgotten when every app rolls its own.
 *
 * ## What got retired on 2026-08-11, and why
 *
 * There were three more things here, and all three left with `/dev`'s verdict
 * (`doc://contracts/art-direction`, axis 1):
 *
 *  - **The `ambient` branch** — three radial lights in three colors, for when there's no
 *    image. That's invented light used as the primary resource, which is exactly what
 *    axis 1 calls out: blurring something that's genuinely behind it is material;
 *    painting a glow that doesn't exist is not. With no content to pull light from, the
 *    stage is now just the surface's canvas plus the veil, which is the honest version.
 *  - **The `image` prop**, which only decided whether that branch got painted. Without it
 *    it decided nothing: the image gets painted by the caller as `children`, because
 *    each one has its own component (`next/image`, `UiImage`) and its own handling of
 *    load failures. A prop that decides nothing is surface area to maintain for
 *    nothing in return.
 *  - **The `Theater` wrapper** — ambient light + veil + content in a bleed container. It
 *    had **zero consumers** measured across the whole tree. A piece with no consumer
 *    isn't part of the system: it's a proposal, and the rule had been written into
 *    `doc://contracts/design-system/surfaces` since the sprint that created it.
 *
 * The one real consumer, `sonus/.../views/TheaterView.tsx`, mounts the layers itself and
 * paints its own cover art: it wasn't using any of the three. What it does use —and why
 * this piece still exists— is the layer order and the veil.
 */

export interface TheaterAmbientProps {
  className?: string;
  /** What sits BELOW the veil but above the canvas: the content's image. */
  children?: ReactNode;
}

/**
 * The background layers, without the container or the content. It exists standalone
 * because Sonus's theater has six layers of its own with their own `z-index` order, and
 * nesting them inside a foreign container would have broken it: these replace ITS first
 * two layers, and the other four never know the difference.
 */
export function TheaterAmbient({ className, children }: TheaterAmbientProps) {
  return (
    <div aria-hidden="true" className={cn("jd-theater-bg", className)}>
      {/* The canvas: the surface's background, whichever one it is. */}
      <div className="jd-theater-canvas" />
      {children}
      {/* The veil. Always. */}
      <div className="jd-theater-veil" />
    </div>
  );
}
