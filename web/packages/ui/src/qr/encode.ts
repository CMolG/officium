import QRCode from "qrcode";

/** Error correction level M, and the 4-module quiet zone ISO/IEC 18004 asks for. */
export const QR_ERROR_CORRECTION = "M";
export const QR_QUIET_ZONE = 4;

export type QrProblem = "empty" | "too-long";

export type QrEncoding =
  | { ok: true; modules: number; path: string }
  | { ok: false; problem: QrProblem };

/**
 * The QR matrix for `value` as one SVG path, quiet zone included, or the reason it cannot be drawn.
 * `modules` is the side of the whole square (the matrix plus both margins), so it is the viewBox.
 */
export function encodeQr(value: string): QrEncoding {
  if (!value) return { ok: false, problem: "empty" };
  let size: number;
  let data: ArrayLike<number>;
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: QR_ERROR_CORRECTION });
    size = qr.modules.size;
    data = qr.modules.data;
  } catch {
    return { ok: false, problem: "too-long" };
  }
  let path = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      path += `M${start + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h${x - start}v1h-${x - start}z`;
    }
  }
  return { ok: true, modules: size + QR_QUIET_ZONE * 2, path };
}
