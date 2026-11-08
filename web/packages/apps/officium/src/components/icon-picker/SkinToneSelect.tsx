"use client";

import { Select } from "@javadaba/ui";

import { SKIN_TONES, type SkinTone } from "../../lib/icons/skin-tone";

const TONE_LABEL: Record<SkinTone, string> = {
  default: "Default",
  light: "Light",
  "medium-light": "Medium-light",
  medium: "Medium",
  "medium-dark": "Medium-dark",
  dark: "Dark",
};

/** The skin tone for every tone-capable emoji; each option is named in text, with its sample glyph. */
export function SkinToneSelect({ value, onChange }: { value: SkinTone; onChange: (tone: SkinTone) => void }) {
  return (
    <Select
      aria-label="Skin tone"
      className="h-11"
      value={value}
      onChange={(next) => onChange(SKIN_TONES.find((tone) => tone === next) ?? "default")}
      options={SKIN_TONES.map((tone) => ({ value: tone, label: TONE_LABEL[tone] }))}
    />
  );
}
