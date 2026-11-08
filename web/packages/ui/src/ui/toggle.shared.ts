/** The axes and state of `Toggle`, `ToggleGroup` and `Switch` on both runtimes. */

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "default" | "sm" | "lg";

export interface ToggleAxes {
  variant?: ToggleVariant | null;
  size?: ToggleSize | null;
  className?: string;
}

export interface TogglePressState {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
}

export interface SwitchState {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** The selection after pressing `value`: toggled off if present, else added (multiple) or replacing (single). */
export function nextSelection(current: string[], value: string, multiple: boolean): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  return multiple ? [...current, value] : [value];
}
