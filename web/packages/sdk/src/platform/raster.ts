/**
 * Web half of `rasterizeSvg`: the browser draws the SVG itself, so the output is the same drawing
 * as the vector, never a second one. Android's half is `raster.native.ts`.
 */

export type RasterType = "image/png" | "image/jpeg";

function loadImage(url: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(width, height);
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The browser could not draw the SVG."));
    image.src = url;
  });
}

/**
 * An SVG document as a PNG or JPG Blob of `width` x `height` pixels. The image is given the target
 * size before it is drawn, so the browser rasterizes the vector at that size (an integer multiple
 * of the SVG's own, no resampling). JPG has no alpha: it is painted on white first.
 */
export async function rasterizeSvg(svg: string, width: number, height: number, type: RasterType): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(url, width, height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser has no canvas to draw on.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The browser could not encode the image."))), type, 0.95),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
