"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Input, type InputProps } from "./input";

export interface NumberInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> {
  /** The number, or `null` for an empty field. */
  value?: number | null;
  defaultValue?: number | null;
  /** Told the new number (`null` when the field is emptied). */
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** The names of the two buttons; a product in another language passes its own. */
  decrementLabel?: string;
  incrementLabel?: string;
}

/** Float sums (0.1 + 0.2) leave dust; six decimals is far below any step a form uses. */
const tidy = (n: number) => Math.round(n * 1e6) / 1e6;

function clamp(n: number, min?: number, max?: number): number {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
}

/**
 * NumberInput (Lib-Controls § Input · Number): a stepper. Minus at the start, plus at the end, the number
 * centered in tabular figures between them; a button that would leave `min`/`max` is disabled, and ArrowUp and
 * ArrowDown step too. The text stays what the person typed until they leave the field (so "-" and "1." can be
 * typed), then it is clamped into range.
 */
export function NumberInput({
  value,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  decrementLabel = "One fewer",
  incrementLabel = "One more",
  className,
  onBlur,
  ...rest
}: NumberInputProps) {
  const [current, setCurrent] = useControllable<number | null>(value, defaultValue, onValueChange);
  const [draft, setDraft] = React.useState<string | null>(null);
  const shown = draft ?? (current === null ? "" : String(current));

  const move = (direction: 1 | -1) => {
    setDraft(null);
    setCurrent(clamp(tidy((current ?? 0) + direction * step), min, max));
  };

  return (
    <div className="relative flex flex-row items-center">
      <IconButton aria-label={decrementLabel} className="absolute left-0.5" disabled={current !== null && min !== undefined && current <= min} onClick={() => move(-1)}>
        <Glyph name="minus" />
      </IconButton>
      <Input
        {...rest}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = event.target.valueAsNumber;
          if (event.target.value === "") setCurrent(null);
          else if (!Number.isNaN(parsed)) setCurrent(parsed);
        }}
        onBlur={(event) => {
          setDraft(null);
          if (current !== null) setCurrent(clamp(current, min, max));
          onBlur?.(event);
        }}
        className={cn("px-12 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", className)}
      />
      <IconButton aria-label={incrementLabel} className="absolute right-0.5" disabled={current !== null && max !== undefined && current >= max} onClick={() => move(1)}>
        <Glyph name="plus" />
      </IconButton>
    </div>
  );
}
