import { useRef, useState } from "react";
import { Pressable, ScrollView, Text as NativeText, View } from "react-native";

import { cn } from "../lib/cn";
import { useFocusOnToggle } from "../lib/use-focus-on-toggle.native";
import { AnchoredLayer } from "./anchored-layer.native";
import { SelectOptionRow } from "./select-option.native";
import { SELECT_MAX_HEIGHT, type SelectProps } from "./select.shared";

/*
 * Select on Android (JAVA-1486): the web's props (`select.shared.ts`) over a `combobox` trigger and
 * an anchored list in a transparent `Modal`. It flips above the trigger when it does not fit
 * below, keeps the 320 max height and scrolls past it; an outside press and Back close it, and
 * focus returns to the trigger. Disabled options are not pressable; the chosen one is `selected`.
 */

export type { SelectOption, SelectProps } from "./select.shared";

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  menuWidth,
  disabled,
  "aria-label": label,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  useFocusOnToggle(open, triggerRef);

  return (
    <>
      <Pressable
        ref={triggerRef}
        collapsable={false}
        role="combobox"
        aria-label={label}
        // The label names the field, so the chosen option is spoken as its value: "Plan, Plus".
        aria-valuetext={selected?.label ?? placeholder}
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        className={cn(
          "min-h-11 flex-row items-center gap-2 self-start rounded-full border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)]/60 px-3 active:opacity-80",
          disabled && "opacity-40",
          className,
        )}
      >
        {selected?.prefix}
        <NativeText className="text-xs font-medium text-[color:var(--jd-ink)]/70" numberOfLines={1}>
          {selected?.label ?? placeholder}
        </NativeText>
        <NativeText aria-hidden className="text-[10px] text-[color:var(--jd-ink)]/70">
          {open ? "▲" : "▼"}
        </NativeText>
      </Pressable>
      <AnchoredLayer open={open} onClose={() => setOpen(false)} anchorRef={triggerRef} minWidth={menuWidth} maxHeight={SELECT_MAX_HEIGHT}>
        <View
          role="list"
          aria-label={label}
          className="overflow-hidden rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] py-1"
        >
          <ScrollView style={{ maxHeight: SELECT_MAX_HEIGHT - 8 }} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <SelectOptionRow
                key={option.value}
                option={option}
                selected={option.value === value}
                onChoose={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </AnchoredLayer>
    </>
  );
}
