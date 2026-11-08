import type { Ref } from "react";

import { cn } from "../lib/cn";
import type { CommandItem } from "./command-menu";
import { ShortcutKeys } from "./shortcut-keys";
import { Text } from "./text";

export interface CommandRowProps {
  item: CommandItem;
  id: string;
  selected: boolean;
  rowRef?: Ref<HTMLDivElement>;
  onHover: () => void;
  onRun: () => void;
}

/**
 * One result of the command menu (Lib-Overlays § CommandMenu): it says what it will do (a second line),
 * and a disabled one keeps its reason under the label. The stone wash marks the active row, the same
 * wash as a menu row, so the two read as one family.
 */
export function CommandRow({ item, id, selected, rowRef, onHover, onRun }: CommandRowProps) {
  const line = item.disabledReason ?? item.description;
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={item.disabledReason ? true : undefined}
      ref={rowRef}
      onPointerMove={onHover}
      onClick={onRun}
      className={cn(
        "flex min-h-11 cursor-pointer flex-row items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm text-[color:var(--jd-ink)]",
        selected && "bg-[color:var(--jd-card)]",
        item.disabledReason && "cursor-not-allowed text-[color:var(--jd-ink)]/50",
      )}
    >
      {item.icon && <Text className="flex size-4 shrink-0 flex-row items-center justify-center">{item.icon}</Text>}
      <span className="flex min-w-0 flex-1 flex-col">
        <Text className="truncate">{item.label}</Text>
        {line && (
          <Text size="xs" tone="faint" className="truncate">
            {line}
          </Text>
        )}
      </span>
      {item.hint && (
        <Text size="xs" tone="faint" className="max-w-[40%] shrink-0 truncate">
          {item.hint}
        </Text>
      )}
      {item.shortcut && <ShortcutKeys combo={item.shortcut} />}
    </div>
  );
}
