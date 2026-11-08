"use client";

import { useState, type ReactNode } from "react";
import { printPage, saveFile } from "@javadaba/sdk/platform";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { DialogCloseButton } from "../ui/dialog-close-button";
import { FieldHelp } from "../ui/field-help";
import { Text } from "../ui/text";
import { toast } from "../ui/toast";
import { cardSvg } from "./card-svg";
import { DEFAULT_CARD_FORMAT, DEFAULT_CARD_SCALE, exportCard, exportFileName, type CardFormat, type CardScale } from "./export-card";
import { QrCode } from "./qr-code";
import { QrExportOptions } from "./qr-export-options";

/** Every word the card shows, in the screen's language. */
export interface QrCardWords {
  title: string;
  /** Read by a screen reader only. */
  description: string;
  /** The card's big sentence: what to do. */
  prompt: string;
  /** The line under the QR. */
  help: string;
  /** The QR's accessible name. */
  label: string;
  /** The Download button. */
  download: string;
  /** The format select's accessible name. */
  format: string;
  /** The size select's accessible name. */
  size: string;
  print: string;
  /** What the card is for, under the buttons. */
  note?: string;
  /** The toast when the link is too long to be a QR. */
  tooLong: string;
  /** The toast when the browser could not make the image. */
  exportFailed: string;
}

export interface QrCardDialogProps {
  /** The name on top of the card: the album's, the form's. */
  heading: string;
  url: string;
  words: QrCardWords;
  /** The downloaded file's name; the chosen format's extension replaces any it has. */
  fileName: string;
  /** The apps' own icons (this package carries none). */
  downloadIcon?: ReactNode;
  printIcon?: ReactNode;
  onClose: () => void;
}

/** What the card prints under the QR: the link without its scheme. */
export const shortLink = (url: string): string => url.replace(/^https?:\/\//, "");

/**
 * A link's QR card, to print or to show on a screen (Album's guest card, Quaestio's form link): the
 * heading, what to do, the QR and the short link. Download gives the same card as a PNG (default), JPG or SVG file, at 1x, 2x or 4x for the rasters.
 */
export function QrCardDialog({ heading, url, words, fileName, downloadIcon, printIcon, onClose }: QrCardDialogProps) {
  const short = shortLink(url);
  const [format, setFormat] = useState<CardFormat>(DEFAULT_CARD_FORMAT);
  const [scale, setScale] = useState<CardScale>(DEFAULT_CARD_SCALE);

  async function download() {
    const svg = cardSvg(heading, url, short, words.prompt, words.help);
    if (!svg) return void toast.error(words.tooLong);
    try {
      await saveFile(await exportCard(svg, format, scale), exportFileName(fileName, format));
    } catch {
      toast.error(words.exportFailed);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader className="flex-row items-start justify-between">
          <DialogTitle>{words.title}</DialogTitle>
          <DialogCloseButton label={words.title} className="max-sm:hidden" />
        </DialogHeader>
        <DialogDescription className="sr-only">{words.description}</DialogDescription>
        <div data-print-card="" className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center text-black shadow-[0_0_0_1px_rgba(17,17,17,0.08)]">
          <Text as="h2" size="xs" weight="bold" className="uppercase tracking-[0.14em] text-black">
            {heading}
          </Text>
          <Text as="p" weight="bold" className="text-[24px] leading-tight text-black">
            {words.prompt}
          </Text>
          <QrCode value={url} label={words.label} className="size-48" />
          <Text as="p" size="sm" className="text-black">
            {words.help}
          </Text>
          <Text as="p" size="xs" className="break-all text-black/60">
            {short}
          </Text>
        </div>
        <QrExportOptions format={format} scale={scale} formatLabel={words.format} sizeLabel={words.size} onFormat={setFormat} onScale={setScale} />
        <div className="flex flex-row flex-wrap gap-2">
          <Button type="button" register="ui" size="sm" variant="outline" onClick={() => void download()}>
            {downloadIcon}
            {words.download}
          </Button>
          <Button type="button" register="ui" size="sm" variant="outline" onClick={printPage}>
            {printIcon}
            {words.print}
          </Button>
        </div>
        {words.note ? <FieldHelp>{words.note}</FieldHelp> : null}
      </DialogContent>
    </Dialog>
  );
}
