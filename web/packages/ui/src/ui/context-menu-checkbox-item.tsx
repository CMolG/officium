"use client";

import * as React from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "../lib/cn";
import { ItemText } from "./context-menu-item-text";
import { DANGER, ItemIcon, rowClass } from "./context-menu-row";
import { Text } from "./text";

export interface ContextMenuCheckboxItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MenuPrimitive.CheckboxItem>, "disabled"> {
  /** Disables the row and says why, under its label. */
  disabledReason?: string;
  shortcut?: string;
  tone?: "danger";
}

/** A row that is on or off (Stacks): a `menuitemcheckbox`, drawn with a tick in the icon column. */
export const ContextMenuCheckboxItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.CheckboxItem>, ContextMenuCheckboxItemProps>(
  ({ disabledReason, shortcut, tone, className, children, textValue, ...props }, ref) => {
    const noteId = React.useId();
    return (
      <MenuPrimitive.CheckboxItem
        ref={ref}
        disabled={disabledReason !== undefined}
        textValue={textValue ?? (typeof children === "string" ? children : undefined)}
        className={cn(rowClass, tone === "danger" && DANGER, className)}
        data-jd-component="ContextMenuCheckboxItem"
        {...props}
      >
        <ItemIcon
          icon={
            <MenuPrimitive.ItemIndicator asChild>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MenuPrimitive.ItemIndicator>
          }
        />
        <ItemText labelId={`${noteId}-label`} noteId={noteId} line={disabledReason} enabled={false}>{children}</ItemText>
        {shortcut && (
          <Text size="xs" tone="faint" aria-hidden className="ml-auto whitespace-nowrap pl-4">
            {shortcut}
          </Text>
        )}
      </MenuPrimitive.CheckboxItem>
    );
  },
);
ContextMenuCheckboxItem.displayName = "ContextMenuCheckboxItem";
