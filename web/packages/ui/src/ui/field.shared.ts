/** What `Input` and `Textarea` take on both runtimes. `onChange` is shaped so a web handler moves over. */

export interface FieldChange {
  target: { value: string };
}

export interface FieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Marks the field as the wrong answer; the accessible description says why. */
  "aria-invalid"?: boolean;
  "aria-label"?: string;
  /** The `id` of the `Label` that names the field; Android speaks a field by this link, not by `aria-label`. */
  "aria-labelledby"?: string;
  id?: string;
  onChange?: (event: FieldChange) => void;
  className?: string;
}

export interface InputProps extends FieldProps {
  type?: "text" | "email" | "password" | "number" | "search" | "tel" | "url";
}

/** The Android field's shared skin (the web halves keep their own classes). */
export const FIELD_BASE =
  "w-full rounded-[var(--radius-jd-control)] border bg-[color:var(--jd-raised)] px-3.5 text-base text-[color:var(--jd-ink)]";

/** The field props a `TextInput` shares by name. */
export function pickField({
  value,
  defaultValue,
  placeholder,
  id,
  "aria-label": label,
  "aria-labelledby": labelledBy,
}: Omit<InputProps, "type" | "onChange" | "disabled" | "className" | "aria-invalid">) {
  return { value, defaultValue, placeholder, nativeID: id, "aria-label": label, "aria-labelledby": labelledBy };
}
