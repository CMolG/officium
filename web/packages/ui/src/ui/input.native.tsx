import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { cn } from "../lib/cn";
import { FIELD_BASE, pickField, type InputProps } from "./field.shared";

/*
 * Input on Android: a `TextInput` with the web's field classes. The border is
 * `--jd-control-border` (the 3:1 floor a field needs), the caret the accent, and focus is the
 * accent border (React Native has no `:focus-visible`, so the state is tracked). `onChange`
 * receives `{ target: { value } }`, so a web handler moves over; `type` picks the keyboard.
 */

const KEYBOARDS: Record<NonNullable<InputProps["type"]>, TextInputProps["keyboardType"]> = {
  text: "default",
  email: "email-address",
  password: "default",
  number: "numeric",
  search: "default",
  tel: "phone-pad",
  url: "url",
};

export function Input({ type = "text", onChange, disabled, className, "aria-invalid": invalid, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      keyboardType={KEYBOARDS[type]}
      secureTextEntry={type === "password"}
      inputMode={type === "search" ? "search" : undefined}
      editable={!disabled}
      aria-disabled={disabled || undefined}
      aria-invalid={invalid}
      onChangeText={(value) => onChange?.({ target: { value } })}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor="rgba(17, 17, 17, 0.64)"
      className={cn(
        FIELD_BASE,
        "min-h-11 py-1",
        focused ? "border-[color:var(--jd-accent)]" : "border-[color:var(--jd-control-border)]",
        invalid && "border-[color:var(--jd-danger)]",
        disabled && "opacity-50",
        className,
      )}
      {...pickField(rest)}
    />
  );
}
