import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { Text } from "./text";

/*
 * One row of the FontPicker list (Lib-Display § FontPicker): the face named in its OWN face, a tick
 * when selected, and a quiet second line. A face that cannot be used stays in the list and says why
 * (`unavailable`) instead of disappearing; it is `aria-disabled`, so it is still announced and reachable.
 */

export interface FontPickerOptionProps {
  id: string;
  index: number;
  label: ReactNode;
  /** The CSS stack the label is set in. */
  stack: string;
  selected: boolean;
  active: boolean;
  /** A line under the name: "Titles only". */
  note?: string;
  /** Why this face cannot be picked. Replaces `note`. */
  unavailable?: string;
  onConsider: () => void;
  onChoose: () => void;
}

export function FontPickerOption({
  id,
  index,
  label,
  stack,
  selected,
  active,
  note,
  unavailable,
  onConsider,
  onChoose,
}: FontPickerOptionProps) {
  const second = unavailable ?? note;
  return (
    <div
      id={id}
      data-index={index}
      role="option"
      aria-selected={selected}
      aria-disabled={unavailable ? true : undefined}
      data-active={active ? "" : undefined}
      onMouseDown={(event) => event.preventDefault()}
      onPointerMove={onConsider}
      onClick={unavailable ? undefined : onChoose}
      className={cn(
        "mx-1 flex cursor-pointer flex-row items-center gap-2 rounded-[var(--radius-jd-control)] px-3 py-2 text-sm text-[color:var(--jd-ink)] pointer-coarse:min-h-11",
        "data-[active]:bg-[color:var(--jd-card)]",
        selected && "font-semibold",
        unavailable && "cursor-not-allowed text-[color:var(--jd-ink)]/50",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <Text className="truncate text-lg" style={{ fontFamily: stack || undefined }}>
          {label}
        </Text>
        {second ? <Text className="text-xs font-normal text-[color:var(--jd-faint)]">{second}</Text> : null}
      </div>
      {selected && <Glyph name="check" />}
    </div>
  );
}
