"use client";

import { Select } from "../ui/select";
import { CARD_FORMATS, CARD_SCALES, type CardFormat, type CardScale } from "./export-card";

const FORMAT_OPTIONS = CARD_FORMATS.map((value) => ({ value, label: value.toUpperCase() }));
const SCALE_OPTIONS = CARD_SCALES.map((value) => ({ value: String(value), label: `${value}x` }));

export interface QrExportOptionsProps {
  format: CardFormat;
  scale: CardScale;
  /** The two selects' accessible names, in the screen's language. */
  formatLabel: string;
  sizeLabel: string;
  onFormat: (format: CardFormat) => void;
  onScale: (scale: CardScale) => void;
}

/** Figma's export row: the format, and for PNG and JPG the size (an SVG has none). */
export function QrExportOptions({ format, scale, formatLabel, sizeLabel, onFormat, onScale }: QrExportOptionsProps) {
  return (
    <div className="flex flex-row gap-2">
      <Select
        aria-label={formatLabel}
        value={format}
        options={FORMAT_OPTIONS}
        onChange={(value) => onFormat(value as CardFormat)}
        className="w-24"
        data-testid="qr-export-format"
      />
      {format === "svg" ? null : (
        <Select
          aria-label={sizeLabel}
          value={String(scale)}
          options={SCALE_OPTIONS}
          onChange={(value) => onScale(Number(value) as CardScale)}
          className="w-24"
          data-testid="qr-export-size"
        />
      )}
    </div>
  );
}
