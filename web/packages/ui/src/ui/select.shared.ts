import type { ReactNode } from "react";

/** What `Select` takes on both runtimes: `select.tsx` (web) and `select.native.tsx` (Android) share it. */

export type SelectOption = {
  value: string;
  label: string;
  /** Painted before the label. A flag emoji, an icon, whatever. */
  prefix?: ReactNode;
  /** A muted line under the label, so choosing needs no glossary elsewhere. It is the option's
   *  accessible DESCRIPTION, never part of its name: "Bug" stays "Bug". */
  description?: string;
  disabled?: boolean;
};

export interface SelectProps {
  value: string | null;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** What the trigger reads when nothing is chosen. */
  placeholder?: string;
  "aria-label": string;
  className?: string;
  /** Minimum width of the list; defaults to the trigger's. */
  menuWidth?: number;
  disabled?: boolean;
  /** Lets a `Theater` scene's ghost cursor aim at the trigger (`theaterTarget(name)`). */
  "data-theater-target"?: string;
}

/** The list's tallest height; a longer one scrolls. */
export const SELECT_MAX_HEIGHT = 320;
