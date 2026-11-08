import type { ReactNode } from "react";
import { View } from "react-native";

import { usePopover } from "./popover-context.native";

/** Places the popover against this view instead of the trigger. */
export function PopoverAnchor({ className, children }: { className?: string; children?: ReactNode }) {
  const { anchorRef } = usePopover();
  return (
    <View ref={anchorRef} collapsable={false} className={className}>
      {children}
    </View>
  );
}
