import { Pressable, Text as NativeText, View } from "react-native";

import { cn } from "../lib/cn";
import type { SelectOption } from "./select.shared";

/**
 * One row of the Select's list: the `option` role with its selected state, and a 44 dp target.
 * The label is its name and the description its hint, so TalkBack reads "Bug", then the line under
 * it, as the web's `aria-describedby` does. The text column sizes to its content (no `flex-1`), so
 * the panel is as wide as its longest option, as the web's is.
 */
export function SelectOptionRow({ option, selected, onChoose }: { option: SelectOption; selected: boolean; onChoose: () => void }) {
  return (
    <Pressable
      role="option"
      aria-label={option.label}
      accessibilityHint={option.description}
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      disabled={option.disabled}
      onPress={onChoose}
      className={cn("min-h-11 flex-row items-center gap-2 px-3 py-2 active:bg-[color:var(--jd-ink)]/10", option.disabled && "opacity-40")}
    >
      {option.prefix}
      <View className="min-w-0 shrink flex-col">
        <NativeText className={cn("text-sm", selected ? "text-[color:var(--jd-ink)]" : "text-[color:var(--jd-ink)]/75")} numberOfLines={1}>
          {option.label}
        </NativeText>
        {option.description ? <NativeText className="text-xs text-[color:var(--jd-muted)]">{option.description}</NativeText> : null}
      </View>
      {selected && <View aria-hidden className="ml-auto size-1.5 shrink-0 rounded-full bg-[color:var(--jd-accent-mid,currentColor)]" />}
    </Pressable>
  );
}
