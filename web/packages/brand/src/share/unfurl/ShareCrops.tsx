import type { CSSProperties } from "react";

import { SHARE_SIZE } from "../spec";

/*
 * The crops layer (Lib-Share, "Crops"): the safe areas that decide where a card's parts sit, drawn over the
 * card. The centre square (630 x 630) is what WhatsApp and iMessage keep; the stripes are the 15 px at the
 * top and the bottom that X's 2:1 large card loses. Everything is in percent of the 1200 x 630 card, so the
 * layer scales with it.
 */

/** What X's large card (2:1) cuts at each of the top and the bottom, in card pixels. */
export const X_CROP_PX = 15;
const SQUARE = SHARE_SIZE.height;
const SQUARE_LEFT = (SHARE_SIZE.width - SQUARE) / 2;

const STRIPES = "repeating-linear-gradient(45deg, rgba(231,34,37,.55) 0 4px, transparent 4px 8px)";

const stripe = (place: "top" | "bottom"): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  [place]: 0,
  height: `${(X_CROP_PX / SHARE_SIZE.height) * 100}%`,
  background: STRIPES,
});

export function ShareCrops({ image, alt }: { image: string; alt: string }) {
  return (
    <div style={{ position: "relative", aspectRatio: `${SHARE_SIZE.width} / ${SHARE_SIZE.height}`, overflow: "hidden", borderRadius: 14 }}>
      <img src={image} alt={alt} style={{ display: "block", width: "100%", height: "100%" }} />
      <span
        data-crop="square"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${(SQUARE_LEFT / SHARE_SIZE.width) * 100}%`,
          width: `${(SQUARE / SHARE_SIZE.width) * 100}%`,
          boxShadow: "0 0 0 9999px rgba(17,17,17,.38)",
          outline: "2px dashed #FFFFFF",
          outlineOffset: -2,
          pointerEvents: "none",
        }}
      />
      <span data-crop="x-top" aria-hidden="true" style={stripe("top")} />
      <span data-crop="x-bottom" aria-hidden="true" style={stripe("bottom")} />
    </div>
  );
}
