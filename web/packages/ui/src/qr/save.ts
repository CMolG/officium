import QRCode from "qrcode";
import { saveFile } from "@javadaba/sdk/platform";

import { QR_ERROR_CORRECTION, QR_QUIET_ZONE, encodeQr } from "./encode";

export interface SaveQrOptions {
  /** The file name, extension included. */
  filename: string;
  /** PNG by default: it prints and attaches anywhere. SVG stays sharp at any size. */
  format?: "png" | "svg";
}

const PNG_WIDTH = 1024;

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ""] = dataUrl.split(",");
  const type = /^data:([^;]+)/.exec(head ?? "")?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

/**
 * Saves the QR for `value` as a PNG (1024 px) or an SVG, black on white, through the platform's
 * `saveFile`. Rejects with an Error in words when the value cannot be a QR.
 */
export async function saveQr(value: string, { filename, format = "png" }: SaveQrOptions): Promise<void> {
  const encoded = encodeQr(value);
  if (!encoded.ok) {
    throw new Error(
      encoded.problem === "empty"
        ? "There is no link to turn into a QR code."
        : "This link is too long to fit in a QR code.",
    );
  }
  const options = { errorCorrectionLevel: QR_ERROR_CORRECTION, margin: QR_QUIET_ZONE } as const;
  if (format === "svg") {
    const svg = await QRCode.toString(value, { ...options, type: "svg" });
    await saveFile(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), filename);
    return;
  }
  const url = await QRCode.toDataURL(value, { ...options, width: PNG_WIDTH });
  await saveFile(dataUrlToBlob(url), filename);
}
