"use client";

import * as React from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "../lib/cn";
import { usePortalContainer } from "../lib/portal-container";
import { DEFAULT_STAMP, surfaceOf, type SurfaceStamp } from "../lib/surface-stamp";
import { Panel } from "./panel";
import { ItemText } from "./context-menu-item-text";
import { RadioDot } from "./context-menu-radio-dot";
import { DANGER, ItemIcon, MENU_SHEET, rowClass } from "./context-menu-row";
import type { ContextMenuPoint } from "./context-menu-trigger";
import { Text } from "./text";

export * from "./context-menu-trigger";

/*
 * ContextMenu: what can be done HERE, where the person is pointing (JAVA-142, ADR 0029: ONE menu model).
 *
 * Controlled and opened at a point: the caller catches the gesture (`useContextMenuTrigger`, in
 * `context-menu-trigger.ts`), works out WHAT was pointed at and keeps that as state. Radix's own
 * `ContextMenu` is uncontrolled and wraps its trigger, so a right-click on a page gap would open an
 * empty menu instead of the browser's. This is Radix's dropdown menu held open by the caller (`point`)
 * and anchored to a zero-size node there, which still brings arrows, type-ahead, submenus, focus,
 * Escape, outside-press and the collision flip/shift. Not modal: a right-click elsewhere closes it and
 * opens the new one, which a modal menu's `pointer-events: none` on the page would turn into the
 * browser's menu. The sheet is the overlay material (Lib-Feedback): radius 14, padding 6, long shadow.
 *
 * A disabled item says why: `ContextMenuItem` has no `disabled` prop but `disabledReason`, which
 * disables the row AND prints the reason under its label (interface-psychology #2).
 */

export interface ContextMenuProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MenuPrimitive.Content>, "side" | "align"> {
  /** Where the menu opens, in viewport coordinates; `null` closes it. */
  point: ContextMenuPoint | null;
  /** Escape, a press outside, or a chosen item. The caller clears `point`. */
  onClose: () => void;
  /** `raised` by default: a floating sheet has to be opaque. `glass` only over something to blur. */
  material?: "plain" | "glass" | "raised";
}

const ContextMenu = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Content>, ContextMenuProps>(
  ({ point, onClose, material = "raised", className, style, children, onCloseAutoFocus, ...props }, ref) => {
    const container = usePortalContainer();
    const [stamp, setStamp] = React.useState<SurfaceStamp>(DEFAULT_STAMP);
    const returnFocus = React.useRef<HTMLElement | null>(null);
    // The last point stays the anchor while the menu plays its exit.
    const [anchor, setAnchor] = React.useState(point);
    if (point && (point.x !== anchor?.x || point.y !== anchor?.y)) setAnchor(point);

    // The anchor mounts once per opening (it is keyed by the point), before Radix moves focus
    // into the menu: the moment to remember where focus was, and which surface we are on.
    const probe = React.useCallback((node: HTMLSpanElement | null) => {
      if (!node) return;
      const active = node.ownerDocument.activeElement;
      returnFocus.current = active instanceof HTMLElement ? active : null;
      setStamp(surfaceOf(node));
    }, []);

    if (!anchor) return null;

    return (
      <MenuPrimitive.Root
        key={`${anchor.x},${anchor.y}`}
        open={point !== null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        modal={false}
      >
        <MenuPrimitive.Trigger asChild>
          <span
            ref={probe}
            aria-hidden
            tabIndex={-1}
            className="pointer-events-none fixed size-0"
            style={{ left: anchor.x, top: anchor.y }}
          />
        </MenuPrimitive.Trigger>
        <MenuPrimitive.Portal container={container ?? undefined}>
          <MenuPrimitive.Content
            ref={ref}
            side="bottom"
            align="start"
            sideOffset={2}
            collisionPadding={8}
            // Back to where the person was (the editor, the canvas), not to the invisible anchor.
            onCloseAutoFocus={(event) => {
              onCloseAutoFocus?.(event);
              if (event.defaultPrevented) return;
              event.preventDefault();
              // Only while focus is still the menu's: with the menu gone it falls to body. Anywhere else
              // an item moved it on purpose (a dialog's field), and taking it back would steal it.
              if (returnFocus.current?.ownerDocument.activeElement === returnFocus.current?.ownerDocument.body) returnFocus.current?.focus({ preventScroll: true });
            }}
            // Radix names the menu after its trigger, which here is a nameless anchor: that would
            // override the caller's `aria-label` and leave the menu with no name at all.
            aria-labelledby={undefined}
            // The surface travels to the portal; without it `--jd-page` doesn't exist in there.
            data-jd-surface={stamp.kind}
            // Inside a modal `Dialog` (Officium's card), presses in here are not "outside" it.
            data-jd-floating-layer=""
            style={{ pointerEvents: "auto", ...style }}
            className={cn(
              "z-[110] outline-none",
              // On the node Radix unmounts: it only defers the unmount for an animation it sees there.
              "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
              "data-[state=open]:animate-jd-pop-in data-[state=closed]:animate-jd-pop-out",
              stamp.className,
              className,
            )}
            {...props}
          >
            <Panel material={material} radius="lg" className={MENU_SHEET}>
              {children}
            </Panel>
          </MenuPrimitive.Content>
        </MenuPrimitive.Portal>
      </MenuPrimitive.Root>
    );
  },
);
ContextMenu.displayName = "ContextMenu";

export interface ContextMenuItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MenuPrimitive.Item>, "disabled"> {
  /** Drawn at 13 px in muted ink before the label; pass the icon element, sized or not. */
  icon?: React.ReactNode;
  /** The keyboard shortcut that does the same, shown on the right (`⌘K`). */
  shortcut?: string;
  /** Disables the item and says why, under its label. There is no disabling without a reason. */
  disabledReason?: string;
  /** A line under the label on an item that stays enabled (why the last try failed); it describes the item, it is not its name. */
  note?: string;
  /** `danger` draws the row in the destructive token; the label must still name the act. */
  tone?: "danger";
}

const ContextMenuItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.Item>, ContextMenuItemProps>(
  ({ icon, shortcut, disabledReason, note, tone, className, children, textValue, ...props }, ref) => {
    const noteId = React.useId();
    const labelId = `${noteId}-label`;
    return (
    <MenuPrimitive.Item
      ref={ref}
      disabled={disabledReason !== undefined}
      // Type-ahead matches the label, not the reason printed under it.
      textValue={textValue ?? (typeof children === "string" ? children : undefined)}
      aria-labelledby={note ? labelId : undefined}
      aria-describedby={note ? noteId : undefined}
      className={cn(rowClass, tone === "danger" && DANGER, className)}
      data-jd-component="ContextMenuItem" {...props}
    >
      <ItemIcon icon={icon} />
      <ItemText labelId={labelId} noteId={noteId} line={disabledReason ?? note} enabled={disabledReason === undefined}>{children}</ItemText>
      {shortcut && (
        <Text size="xs" tone="faint" aria-hidden className="ml-auto whitespace-nowrap pl-4">
          {shortcut}
        </Text>
      )}
    </MenuPrimitive.Item>
    );
  },
);
ContextMenuItem.displayName = "ContextMenuItem";

/**
 * One choice of several (how text wraps an image, its position): a `menuitemradio`, so the chosen
 * one is announced as checked and drawn with a tick, never told apart by colour alone
 * (interface-psychology #4). The tick sits in the icon column, so labels still line up.
 */
const ContextMenuRadioGroup = MenuPrimitive.RadioGroup;

export interface ContextMenuRadioItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MenuPrimitive.RadioItem>, "disabled"> {
  /** Disables the choice and says why, under its label. */
  disabledReason?: string;
}

const ContextMenuRadioItem = React.forwardRef<React.ElementRef<typeof MenuPrimitive.RadioItem>, ContextMenuRadioItemProps>(
  ({ disabledReason, className, children, textValue, ...props }, ref) => {
    const noteId = React.useId();
    return (
    <MenuPrimitive.RadioItem
      ref={ref}
      disabled={disabledReason !== undefined}
      textValue={textValue ?? (typeof children === "string" ? children : undefined)}
      className={cn(rowClass, className)}
      data-jd-component="ContextMenuRadioItem" {...props}
    >
      <ItemIcon
        icon={
          <MenuPrimitive.ItemIndicator>
            <RadioDot />
          </MenuPrimitive.ItemIndicator>
        }
      />
      <ItemText labelId={`${noteId}-label`} noteId={noteId} line={disabledReason} enabled={false}>{children}</ItemText>
    </MenuPrimitive.RadioItem>
    );
  },
);
ContextMenuRadioItem.displayName = "ContextMenuRadioItem";

/** A heading or a note inside the menu (the word a spelling menu is about, "no suggestions"). */
const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Label
    ref={ref}
    className={cn(
      // The kicker voice names a group (Lib-Feedback `.ml`); a plain sentence ("No other boards") inside it stays readable.
      "flex flex-row items-center gap-2 px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]",
      className,
    )}
    {...props}
  />
));
ContextMenuLabel.displayName = "ContextMenuLabel";

const ContextMenuGroup = MenuPrimitive.Group;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenuPrimitive.Separator ref={ref} className={cn("mx-1.5 my-1 h-px bg-[color:var(--jd-line)]", className)} {...props} />
));
ContextMenuSeparator.displayName = "ContextMenuSeparator";

const ContextMenuSub = MenuPrimitive.Sub;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubTrigger> & { icon?: React.ReactNode }
>(({ icon, className, children, ...props }, ref) => (
  <MenuPrimitive.SubTrigger
    ref={ref}
    className={cn(rowClass, "data-[state=open]:bg-[color:var(--jd-card)]", className)}
    {...props}
  >
    <ItemIcon icon={icon} />
    <Text className="min-w-0 flex-1">{children}</Text>
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="ml-auto shrink-0">
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </MenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = "ContextMenuSubTrigger";

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof MenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenuPrimitive.SubContent> & { material?: "plain" | "glass" | "raised" }
>(({ material = "raised", className, children, ...props }, ref) => {
  const container = usePortalContainer();
  return (
    <MenuPrimitive.Portal container={container ?? undefined}>
      <MenuPrimitive.SubContent
        ref={ref}
        collisionPadding={8}
        data-jd-floating-layer=""
        className={cn(
          // The submenu portals on its own, so it inherits the parent's surface only if it is
          // nested in the same one; the product surface is the honest fallback, as in popover.
          "jd-surface z-[110] outline-none",
          "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
          "data-[state=open]:animate-jd-pop-in data-[state=closed]:animate-jd-pop-out",
          className,
        )}
        {...props}
      >
        <Panel material={material} radius="lg" className={MENU_SHEET}>
          {children}
        </Panel>
      </MenuPrimitive.SubContent>
    </MenuPrimitive.Portal>
  );
});
ContextMenuSubContent.displayName = "ContextMenuSubContent";

export {
  ContextMenu,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
};
