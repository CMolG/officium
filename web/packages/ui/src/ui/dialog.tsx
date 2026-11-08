"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { useBackDismisses, type LayerAddress } from "../lib/back-dismisses";
import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { usePortalContainer } from "../lib/portal-container";
import { surfaceOf } from "../lib/surface-stamp";
import { typeClass } from "../lib/type-scale";
import { Glyph } from "./glyph";
import { ToastDock } from "./toast-dock";

/**
 * Modal by default. Inside a portal container (a `Theater` frame) it is not: Radix's modal
 * mode locks the scroll of the whole document and sets `pointer-events: none` on `<body>`,
 * which would freeze the page hosting the frame while a scene shows a dialog.
 *
 * On a phone, Back closes it (JAVA-224, `useBackDismisses`) -- never inside a frame, where a
 * scene playing itself must not touch the history of the page hosting it.
 *
 * With an `address` (JAVA-1417) the dialog owns one history entry at that app route, at every
 * width, one step above `address.under`. It stays off inside a container, like the phone Back.
 */
function Dialog({
  modal,
  open,
  defaultOpen,
  onOpenChange,
  address,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root> & { address?: LayerAddress }) {
  const container = usePortalContainer();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen ?? false);
  const dismissed = useBackDismisses((open ?? uncontrolledOpen) && !container, address);
  return (
    <DialogPrimitive.Root
      modal={container ? false : modal}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => {
        if (open === undefined) setUncontrolledOpen(next);
        // Radix only calls this for the person's own dismissal: Escape, a press outside, a Close.
        if (!next) dismissed();
        onOpenChange?.(next);
      }}
      {...props}
    />
  );
}

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    // A layer, not a surface to paint: tokens.css paints `[data-jd-surface]` with the page colour unless this is
    // set, and that unlayered rule used to beat the translucent scrim (and the raised white of the box below).
    data-jd-layer=""
    // 100 is the ecosystem's dialog layer: above the consent banner (90), which sat over this
    // dialog's bottom row while it was at 50 ([[JDB-251]]). Popover sits above it at 110.
    className={cn(
      "fixed inset-0 z-[100] bg-[color:var(--jd-scrim)] data-[state=open]:animate-jd-fade-in data-[state=closed]:animate-jd-fade-out",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Panels of the system that portal to <body> (the `Select` listbox) live outside the dialog's DOM,
 * so without this a press on one of their options counts as "outside" and closes the dialog.
 */
const FLOATING_LAYER_ATTR = "data-jd-floating-layer";

function insideFloatingLayer(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${FLOATING_LAYER_ATTR}]`) !== null;
}

/**
 * Escape from a floating layer ABOVE the dialog (a toast) is that layer's. A dialog that is itself a floating
 * layer (the feedback report form, so the feedback menu ignores gestures in it) is not above itself: Escape in
 * its own fields closes it. Radix sends Escape to the topmost dialog only, so a dialog under it is never asked.
 */
function escapeFromLayerAbove(target: EventTarget | null): boolean {
  const layer = target instanceof Element ? target.closest(`[${FLOATING_LAYER_ATTR}]`) : null;
  return layer !== null && !layer.matches('[role="dialog"]');
}

/**
 * DialogContent WITHOUT a default close button (unlike the base shadcn version):
 * each surface provides its own close control (header). Apply `className="jdui …"`
 * to resolve the shadcn tokens.
 *
 * Two shapes (JAVA-59). From `sm` up, a centred box that never outgrows its container: a tall
 * dialog scrolls inside it instead of losing its bottom row off-screen. Below `sm`, the whole
 * screen, rising from the bottom edge: a centred box on a phone leaves a strip of page around a
 * form too narrow to use, and the page behind it still looks touchable. The phone half is written
 * with `max-sm:` on purpose -- every caller sets its own width (`max-w-sm`, `max-w-5xl`) or height,
 * and a variant rule is emitted after an unprefixed one, so the phone shape wins without any
 * caller having to know it exists. It is a flex column there, so a `DialogFooter` can sit at the
 * bottom of a short sheet.
 *
 * The one exception to "no default close button" is that phone sheet (JAVA-224): it covers the
 * whole screen, so it has no scrim to press and a phone has no Escape key, and a dialog whose
 * only exit was a footer Cancel at the bottom -- or none at all, like Officium's Members -- was
 * a trap. It gets a labelled 44 px close in its top-right corner, sticky so a long sheet never
 * scrolls it away; the centred box from `sm` up is unchanged. `sheetClose={false}` is for a
 * dialog whose own header already draws a close at every width.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { sheetClose?: boolean }
>(({ className, children, sheetClose = true, onPointerDownOutside, onFocusOutside, onOpenAutoFocus, onEscapeKeyDown, ...props }, ref) => {
  const container = usePortalContainer();
  // The portal hangs off <body>, outside the surface that opened it, and `--jd-raised` and `--jd-scrim` only exist
  // on a surface: the layer wears the opener's (the focused element's), or the product's when it has none, so a
  // dialog is never drawn transparent (the same stamp `Popover` carries; see its header comment).
  const [stamp] = React.useState(() => surfaceOf(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null) ?? document.body));
  return (
    <DialogPortal container={container ?? undefined}>
      {/* Radix only renders its Overlay for a MODAL dialog, and inside a container the dialog
          isn't one (see `Dialog`): the same scrim, drawn by hand, so the frame still dims. A
          press on it is a press outside, which closes the dialog as the real overlay would. */}
      {container ? (
        <div aria-hidden="true" className="fixed inset-0 z-[100] bg-[color:var(--jd-scrim)] animate-jd-fade-in" />
      ) : (
        <DialogOverlay data-jd-surface={stamp.kind} className={stamp.className} />
      )}
      <DialogPrimitive.Content
        ref={ref}
        data-jd-surface={stamp.kind}
        data-jd-layer=""
        className={cn(
          stamp.className,
          // `100%`, not `100dvh`: a fixed box's percentage is its containing block -- the viewport
          // in an app, the frame when a Theater draws the dialog inside itself.
          // A column, not a grid: a grid track grew to its widest child (a <pre>, a fieldset's min-content), and the
          // vertical scroll then scrolled the whole dialog sideways. A flex column holds every child to the dialog's
          // width, so wide content wraps or scrolls in its own box; children never shrink in height, so the dialog
          // scrolls instead of squashing them. Unless the caller clips the box (`overflow-hidden`): then a child scrolls
          // itself (`min-h-0 flex-1 overflow-y-auto`) and must shrink, or it overflows the clip with no scroll at all and
          // whatever sits below it (a dialog's actions, a card's buttons) is out of reach.
          "fixed left-[50%] top-[50%] z-[100] flex max-h-[calc(100%-2rem)] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-contain bg-[color:var(--jd-raised)] p-7 text-[color:var(--jd-ink)] shadow-[var(--jd-shadow-overlay)] *:min-w-0 [&:not(.overflow-hidden)>*]:shrink-0 data-[state=open]:animate-jd-pop-in data-[state=closed]:animate-jd-pop-out sm:rounded-[var(--radius-jd-xl)]", // layout-ok: the max height is a formula, not a size
          // `h-auto w-auto` against the insets: a caller's fixed size (web-os's WallpaperPicker is
          // `h-150 w-215`) would otherwise win over them and spill past a phone's edges. The phone
          // sheet is the page's own washi, not the raised white: it IS the screen (Lib-Overlays § Dialog).
          "max-sm:inset-0 max-sm:flex max-sm:h-auto max-sm:max-h-none max-sm:w-auto max-sm:max-w-none max-sm:translate-none max-sm:flex-col max-sm:rounded-none max-sm:bg-[color:var(--jd-page)] max-sm:p-4 max-sm:shadow-none max-sm:data-[state=open]:animate-jd-sheet-in max-sm:data-[state=closed]:animate-jd-sheet-out",
          className,
        )}
        onOpenAutoFocus={(event) => {
          // Inside a frame, a dialog can open without the viewer touching it (a scene playing
          // itself). Taking focus then would pull it out of whatever they are doing on the page.
          if (container && !container.contains(document.activeElement)) event.preventDefault();
          onOpenAutoFocus?.(event);
        }}
        onPointerDownOutside={(event) => {
          if (insideFloatingLayer(event.target)) event.preventDefault();
          onPointerDownOutside?.(event);
        }}
        onFocusOutside={(event) => {
          if (insideFloatingLayer(event.target)) event.preventDefault();
          onFocusOutside?.(event);
        }}
        // Escape pressed on a toast (a floating layer) dismisses the toast, not the dialog under it (JAVA-1620).
        onEscapeKeyDown={(event) => {
          if (escapeFromLayerAbove(event.target)) event.preventDefault();
          onEscapeKeyDown?.(event);
        }}
        {...props}
      >
        {sheetClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            data-jd-sheet-close=""
            className={cn(
              // Close on the LEFT, like the design's phone sheet: the action sits at the bottom, in thumb reach.
              "sticky top-0 z-10 -mb-2 -ml-2 -mt-2 flex size-11 shrink-0 flex-row items-center justify-center self-start rounded-[var(--radius-jd-control)] bg-[color:var(--jd-page)] text-[color:var(--jd-ink)] transition-colors hover:bg-[color:var(--jd-hover)] sm:hidden",
              FOCUS_RING,
            )}
          >
            <Glyph name="x" size={20} />
          </DialogPrimitive.Close>
        )}
        {children}
        {/* Last, so a toast sits at the bottom of the dialog, inside its focus trap (JAVA-1620). */}
        <ToastDock />
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

/**
 * The dialog's actions. On a phone they stack full width, the primary one (the LAST child) on
 * top, and the row sits at the bottom of a short sheet, where a thumb reaches it; from `sm` up
 * they line up on the right, and wrap onto another row when they do not fit (the content holds every
 * child to the dialog's width, so a row that did not wrap would be clipped). Anything that is not
 * an action (a reason a button is disabled) goes above it, not inside.
 */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end max-sm:mt-auto", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    // Doto 26: the dialog's title voice (`dt`); the display font is never set under 20 px.
    className={cn(typeClass("display-s"), "text-[color:var(--jd-ink)]", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(typeClass("body-s"), "text-[color:var(--jd-muted)]", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
