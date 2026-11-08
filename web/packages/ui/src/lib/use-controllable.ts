import { useCallback, useState } from "react";

/**
 * A value the caller may own (`value` + `onChange`) or leave to the piece (`defaultValue`): what
 * Radix does for the web halves, which the Android twins have no Radix to do for them.
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState(defaultValue);
  const current = value === undefined ? inner : value;
  const set = useCallback(
    (next: T) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  return [current, set];
}
