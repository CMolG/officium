"use client";

import { BadgeCheck, Clock3, Coins } from "lucide-react";

import { StatTile } from "../backlog/StatTile";
import { SAMPLE_LABEL } from "./contributions-sample";
import type { Figure } from "./contributions-view";

const ICONS = [Clock3, Coins, BadgeCheck] as const;

/** The three figures of one profile in a group named for it: a row from `@2xl`, a column on a phone. */
export function ContributionsFigures({ name, figures }: { name: string; figures: Figure[] }) {
  return (
    <div
      role="group"
      aria-live="polite"
      aria-label={`Per clean delivery, ${name}, ${SAMPLE_LABEL.toLowerCase()}`}
      className="flex flex-col gap-3 @2xl:flex-row"
    >
      {figures.map((figure, i) => (
        <StatTile key={figure.label} icon={ICONS[i]} label={figure.label} value={figure.value} note={figure.note} />
      ))}
    </div>
  );
}
