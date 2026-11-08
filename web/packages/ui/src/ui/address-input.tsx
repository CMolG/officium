"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { Input, type InputProps } from "./input";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

/** One address the person can pick: the street line, and the place under it ("30001 Murcia"). */
export interface AddressSuggestion {
  id: string;
  line: string;
  detail?: string;
}

export interface AddressInputProps extends Omit<InputProps, "type" | "value" | "onChange" | "role" | "aria-expanded"> {
  /** What is typed. The caller owns it, so a picked suggestion can replace it. */
  value: string;
  onValueChange: (value: string) => void;
  /** The matches for what is typed. Empty hides the list. */
  suggestions: readonly AddressSuggestion[];
  onPick: (suggestion: AddressSuggestion) => void;
  /** The list's accessible name. */
  listLabel?: string;
}

/**
 * AddressInput (Lib-Controls § Input · Address): a text field with a list of matching addresses under it
 * (a combobox: focus stays in the field, Up and Down move through the list, Enter picks, Escape closes). Each
 * option is the street line over the place, so two "Calle Mayor 1" in different cities can be told apart. The
 * list floats in a portal, so a dialog or a scrolling form never cuts it.
 *
 * TODO(backend): the matches need an address-autocomplete endpoint (a geocoder behind `javadaba-api`); until
 * one exists the caller passes `suggestions` from whatever it has and an empty list shows no dropdown.
 */
export function AddressInput({ value, onValueChange, suggestions, onPick, listLabel = "Address suggestions", className, onKeyDown, onBlur, ...rest }: AddressInputProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const list = React.useId();
  const anchor = React.useRef<HTMLDivElement>(null);
  const open = !dismissed && suggestions.length > 0;
  const optionId = (index: number) => `${list}-${index}`;

  const pick = (suggestion: AddressSuggestion) => {
    onPick(suggestion);
    setDismissed(true);
    setActive(-1);
  };

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div ref={anchor}>
          <Input
            {...rest}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={list}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
            value={value}
            onChange={(event) => {
              setDismissed(false);
              setActive(-1);
              onValueChange(event.target.value);
            }}
            onKeyDown={(event) => {
              onKeyDown?.(event);
              if (!open) {
                if (event.key === "ArrowDown" && suggestions.length > 0) setDismissed(false);
                return;
              }
              if (event.key === "ArrowDown") (event.preventDefault(), setActive((active + 1) % suggestions.length));
              else if (event.key === "ArrowUp") (event.preventDefault(), setActive((active - 1 + suggestions.length) % suggestions.length));
              else if (event.key === "Enter" && active >= 0) (event.preventDefault(), pick(suggestions[active]));
              else if (event.key === "Escape") (event.preventDefault(), event.stopPropagation(), setDismissed(true));
            }}
            onBlur={(event) => {
              onBlur?.(event);
              // A press on an option blurs the field first; the option's own press handler picks before this closes.
              setTimeout(() => setDismissed(true), 120);
            }}
            className={cn(open && "border-[color:var(--jd-ink)]", className)}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        material="raised"
        align="start"
        sideOffset={6}
        // Focus stays in the field: the list is a listbox the field points at, not a dialog.
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.target instanceof Node && anchor.current?.contains(event.target) && event.preventDefault()}
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="p-0"
      >
        <ul id={list} role="listbox" aria-label={listLabel} className="m-0 flex list-none flex-col p-1.5">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(suggestion)}
              onPointerMove={() => setActive(index)}
              className={cn("flex min-h-11 cursor-pointer flex-col justify-center gap-px rounded-lg px-2.5 py-1.5", index === active && "bg-[color:var(--jd-card)]")}
            >
              <span className="text-sm font-semibold text-[color:var(--jd-ink)]">{suggestion.line}</span>
              {suggestion.detail && <span className="text-xs text-[color:var(--jd-faint)]">{suggestion.detail}</span>}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
