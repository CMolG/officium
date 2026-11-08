import { useState } from "react";
import { TextInput } from "react-native";

import { cn } from "../lib/cn";
import { FIELD_BASE, pickField, type FieldProps } from "./field.shared";

/** Textarea on Android: the `Input` field, multiline, at the web's `min-h-24`. */
export function Textarea({ onChange, disabled, className, "aria-invalid": invalid, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      editable={!disabled}
      aria-disabled={disabled || undefined}
      aria-invalid={invalid}
      onChangeText={(value) => onChange?.({ target: { value } })}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholderTextColor="rgba(17, 17, 17, 0.58)"
      className={cn(
        FIELD_BASE,
        "min-h-24 py-2",
        focused ? "border-[color:var(--jd-accent)]" : "border-[color:var(--jd-control-border)]",
        invalid && "border-[#c0271c]",
        disabled && "opacity-50",
        className,
      )}
      {...pickField(rest)}
    />
  );
}
