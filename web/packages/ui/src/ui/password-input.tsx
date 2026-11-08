"use client";

import * as React from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { Input, type InputProps } from "./input";

/*
 * PasswordInput: a password field with its reveal (Lib-Controls § Input · Password). The eye sits
 * inside the field's right edge, names what it will do ("Show password" / "Hide password") and
 * reports it with `aria-pressed`. The value stays masked until the person asks.
 */

export interface PasswordInputProps extends Omit<InputProps, "type"> {
  /** The reveal's accessible names. Default English; pass the app's language. */
  labels?: { show: string; hide: string };
}

export function PasswordInput({
  className,
  labels = { show: "Show password", hide: "Hide password" },
  ...props
}: PasswordInputProps) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative flex flex-row items-center">
      <Input {...props} type={shown ? "text" : "password"} className={cn("pr-12", className)} />
      <IconButton
        aria-label={shown ? labels.hide : labels.show}
        aria-pressed={shown}
        disabled={props.disabled}
        onClick={() => setShown((value) => !value)}
        className="absolute right-0.5"
      >
        <Glyph name={shown ? "eye-off" : "eye"} />
      </IconButton>
    </div>
  );
}
