/** Android half of `rasterizeSvg` (see `raster.ts`): there is no canvas, so a raster export is not offered yet. */

export type RasterType = "image/png" | "image/jpeg";

export async function rasterizeSvg(_svg: string, _width: number, _height: number, _type: RasterType): Promise<Blob> {
  throw new Error("Raster export is not available on this device.");
}
