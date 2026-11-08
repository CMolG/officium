"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Input, type InputProps } from "./input";

export interface SearchInputProps extends Omit<InputProps, "type" | "value" | "defaultValue" | "onChange"> {
  value?: string;
  defaultValue?: string;
  /** Told the text as it changes, and "" when it is cleared. */
  onValueChange?: (value: string) => void;
  /** The clear button's name; a product in another language passes its own. */
  clearLabel?: string;
}

/**
 * SearchInput (Lib-Controls § Input · Search): a pill with a magnifier at its start and, once there is text,
 * a clear button at its end. Clear empties the field and puts the caret back in it, so typing again needs no
 * click. The browser's own clear cross is hidden: two crosses in one field is one too many. Give it a visible
 * `Label` above, like any field; a search with only a placeholder has no name once it is filled.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, defaultValue = "", onValueChange, clearLabel = "Clear search", className, ...rest },
  forwarded,
) {
  const [text, setText] = useControllable(value, defaultValue, onValueChange);
  const field = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className="relative flex flex-row items-center">
      <Glyph name="search" size={16} className="pointer-events-none absolute left-3.5 text-[color:var(--jd-faint)]" />
      <Input
        {...rest}
        ref={(node) => {
          field.current = node;
          if (typeof forwarded === "function") forwarded(node);
          else if (forwarded) forwarded.current = node;
        }}
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={cn("rounded-full pl-10 pr-11 [&::-webkit-search-cancel-button]:hidden", className)}
      />
      {text !== "" && (
        <IconButton
          aria-label={clearLabel}
          className="absolute right-0.5 rounded-full"
          onClick={() => {
            setText("");
            field.current?.focus();
          }}
        >
          <Glyph name="x" />
        </IconButton>
      )}
    </div>
  );
});
