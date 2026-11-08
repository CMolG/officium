import { useMemo, type ReactNode } from "react";
import { View } from "react-native";

import { cn } from "../lib/cn";
import { useControllable } from "../lib/use-controllable";
import { ToggleGroupContext } from "./toggle-group-context.native";
import { nextSelection, type ToggleAxes } from "./toggle.shared";

/*
 * ToggleGroup on Android: the web's single and multiple selection, with the same props (`type`,
 * `value`, `defaultValue`, `onValueChange`). An item is `aria-selected` for TalkBack, inside a
 * `group`. Single mode reports `""` when the selection is cleared, as Radix does.
 */

export { ToggleGroupItem } from "./toggle-group-item.native";

type GroupProps = ToggleAxes & { children?: ReactNode; "aria-label"?: string } & (
    | { type: "single"; value?: string; defaultValue?: string; onValueChange?: (value: string) => void }
    | { type: "multiple"; value?: string[]; defaultValue?: string[]; onValueChange?: (value: string[]) => void }
  );

const asList = (v: string | string[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : v ? [v] : []);

export function ToggleGroup(props: GroupProps) {
  const { variant, size, className, children } = props;
  const [selected, setSelected] = useControllable<string[]>(asList(props.value), asList(props.defaultValue) ?? [], (next) => {
    if (props.type === "multiple") props.onValueChange?.(next);
    else props.onValueChange?.(next[0] ?? "");
  });
  const multiple = props.type === "multiple";
  const context = useMemo(
    () => ({ variant, size, selected, toggle: (value: string) => setSelected(nextSelection(selected, value, multiple)) }),
    [variant, size, selected, multiple, setSelected],
  );

  return (
    <ToggleGroupContext.Provider value={context}>
      <View role="group" aria-label={props["aria-label"]} className={cn("flex flex-row items-center justify-center gap-1", className)}>
        {children}
      </View>
    </ToggleGroupContext.Provider>
  );
}
