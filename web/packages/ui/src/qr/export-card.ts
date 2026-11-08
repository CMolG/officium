import { rasterizeSvg } from "@javadaba/sdk/platform/raster";

/*
 * The QR card as a file in the format the person picked, like Figma's export row: PNG and JPG are
 * drawn from the SAME card SVG (never a second drawing of the card) at 1x, 2x or 4x of its own size.
 * The scales are integers on purpose: a QR is only scannable when its modules stay sharp.
 */

export const CARD_FORMATS = ["png", "jpg", "svg"] as const;
export type CardFormat = (typeof CARD_FORMATS)[number];

export const CARD_SCALES = [1, 2, 4] as const;
export type CardScale = (typeof CARD_SCALES)[number];

export const DEFAULT_CARD_FORMAT: CardFormat = "png";
export const DEFAULT_CARD_SCALE: CardScale = 1;

const MIME = { png: "image/png", jpg: "image/jpeg", svg: "image/svg+xml" } as const;

/** The card's own size, as `cardSvg` declares it. */
const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1500;

/** The file name with the format's extension, whatever extension it came with. */
export function exportFileName(fileName: string, format: CardFormat): string {
  return `${fileName.replace(/\.[^./\\]+$/, "")}.${format}`;
}

/** The card SVG as a Blob of `format`; `scale` only matters for PNG and JPG. */
export async function exportCard(svg: string, format: CardFormat, scale: CardScale): Promise<Blob> {
  if (format === "svg") return new Blob([svg], { type: MIME.svg });
  return rasterizeSvg(svg, CARD_WIDTH * scale, CARD_HEIGHT * scale, MIME[format]);
}
