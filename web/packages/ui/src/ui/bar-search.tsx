"use client";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Text } from "./text";

/*
 * BarSearch -- the search entry in a product bar's slot (Lib-Chrome): a field-shaped button with the
 * shortcut beside it ("Search Officium  Cmd K") that opens the product's command menu, and on a phone
 * a single icon button with the same name. It owns no search: `onOpen` does.
 */

export interface BarSearchProps {
  /** The button's words and its name: "Search Officium". */
  label: string;
  /** The shortcut as the keyboard prints it ("Cmd K"). Omitted on a device without a keyboard. */
  shortcut?: string;
  onOpen: () => void;
  className?: string;
}

export function BarSearch({ label, shortcut, onOpen, className }: BarSearchProps) {
  return (
    <>
      <Button
        register="ui"
        variant="outline"
        size="md"
        onClick={onOpen}
        className={cn("max-sm:hidden", className)}
      >
        <Glyph name="search" size={16} />
        <Text>{label}</Text>
        {shortcut && (
          <Text className="rounded-md bg-[color:var(--jd-card)] px-1.5 py-0.5 text-[11px] text-[color:var(--jd-muted)]">
            {shortcut}
          </Text>
        )}
      </Button>
      <IconButton aria-label={label} onClick={onOpen} className={cn("sm:hidden", className)}>
        <Glyph name="search" size={18} />
      </IconButton>
    </>
  );
}
