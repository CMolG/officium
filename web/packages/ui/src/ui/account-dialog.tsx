"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { themeFor, themeVars, type SurfaceKind } from "@javadaba/brand";

import { useBackDismisses } from "../lib/back-dismisses";
import { cn } from "../lib/cn";
import { typeClass } from "../lib/type-scale";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { ProductSeal } from "./product-seal";

/**
 * The ecosystem's account dialog — the Javadaba ID panel, wherever it is opened from.
 *
 * <h2>The background, which is what it was reported for</h2>
 *
 * The landing's version painted its panel `bg-[--site-fg]/[0.04]`: four percent of the ink
 * colour over a blurred backdrop. That is not a background, it is a veil — the page kept showing
 * through the form, and the dialog read as an artefact rather than as an object. Reported by the
 * user on 2026-08-23 ("you did not add background to that modal, it makes the modal weird").
 *
 * Here the panel is **opaque**, and its colour is not chosen: it is `--jd-page` of whatever
 * surface the product wears. So the two styles the user asked for —dark and light— are not two
 * code paths, they are two surfaces, and everything inside recolours through custom-property
 * inheritance without a single conditional.
 *
 * <h2>How a product dresses it</h2>
 *
 * `brand` goes through the product manifest (`@javadaba/brand`'s `themes.ts`), which answers
 * both halves at once: which surface this product may wear, and what its accent resolves to on
 * it — including `--jd-accent-mark`, the accent made visible without losing its hue. Asking for
 * a surface a product does not declare gets you its default rather than an error, which is what
 * stops a generic dialog from putting Sonus on white because it assumed light.
 *
 * Opened from the landing's black front page it is black; opened from inside Curriculum it is
 * that app's product surface with Curriculum's gold. Same object, same code, one declaration.
 *
 * <h2>What it deliberately does NOT do</h2>
 *
 * It holds no session, no provider and no form. It is chrome: a surface, a header and a slot.
 * Authentication belongs to whoever owns it — one login for the whole ecosystem, validated by
 * Quarkus (`rules/architecture.md`, single ecosystem session). A dialog that knew how to sign
 * someone in would be exactly the second login surface that invariant forbids.
 */
export interface AccountDialogProps {
  open: boolean;
  onClose: () => void;
  /** Brand slug in `@javadaba/brand`'s registry. Decides the surface and the accent. */
  brand?: string;
  /**
   * The surface to dress it in. A REQUEST: a surface the product doesn't declare falls back to
   * its default.
   */
  surface?: SurfaceKind;
  /**
   * Small caps line above the title. The ecosystem's own, by default.
   *
   * `null` paints no kicker at all. That is not a style knob: on a dialog whose title already
   * says "Your Javadaba account", a "JAVADABA ID." sitting on top of it is the same statement
   * twice, and the second one is in the house's most technical register — internal vocabulary
   * reaching a visitor, which `rules/value-clarity.md` rules out.
   */
  kicker?: string | null;
  title: string;
  /**
   * One quiet line under the title, saying what the account IS for.
   *
   * It exists to replace something bigger. The dialog used to make the case with three icon
   * chips ("All your apps", "Right where you left off", "Credit") stacked above a form the
   * visitor had already decided to fill in — the argument arriving after the decision, which is
   * cost with no benefit. One subtitle says the same thing without competing with the fields.
   */
  subtitle?: React.ReactNode;
  /** Accessible name of the dialog. Defaults to the title. */
  ariaLabel?: string;
  /**
   * Extra custom properties to publish on the panel.
   *
   * It exists for one real case and it is the case that produced the report. The dialog is
   * portaled to `document.body`, so it hangs OUTSIDE whatever element the host app publishes
   * its own variables on — the landing declares `--site-*` on `.site-frame`, and a landing
   * piece rendered in here resolved every one of them to nothing. No error, no warning: an
   * invalid `background` is simply transparent, which is the veil the user saw. Whoever mounts
   * the dialog passes its aliases and its own pieces work inside it.
   */
  vars?: React.CSSProperties;
  children: React.ReactNode;
  className?: string;
  /**
   * Where focus goes when it closes, for a dialog opened from something that is gone by then (a
   * menu entry in a menu that closed). Defaults to Radix's: back to what had focus.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

export function AccountDialog({
  open,
  onClose,
  brand = "javadaba",
  surface,
  kicker = "JAVADABA ID",
  title,
  subtitle,
  ariaLabel,
  vars,
  children,
  className,
  onCloseAutoFocus,
}: AccountDialogProps) {
  const theme = themeFor(brand, surface);
  // On a phone, Back closes it (JAVA-1026), as it does a `Dialog`.
  const dismissed = useBackDismisses(open);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        dismissed();
        onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/*
          The backdrop is opaque enough to separate on its own. `backdrop-blur` is the pleasant
          half, not the load-bearing one: a translucent panel over a blurred page is still a
          translucent panel, which is how the veil went unnoticed for so long.
        */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md data-[state=open]:animate-jd-fade-in data-[state=closed]:animate-jd-fade-out" />
        <DialogPrimitive.Content
          aria-label={ariaLabel ?? title}
          onCloseAutoFocus={onCloseAutoFocus}
          // The surface travels as an ATTRIBUTE and the accent as custom properties: the same
          // split `Surface` uses, and the reason a nested piece recolours without being told.
          data-jd-surface={theme.surface}
          style={{ ...(themeVars(theme) as React.CSSProperties), ...vars }}
          className={cn(
            "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2",
            // On a phone it is the whole screen on the page's own washi, Close on the left in thumb reach (Acct-Frames).
            "max-sm:inset-0 max-sm:left-0 max-sm:top-0 max-sm:h-auto max-sm:max-h-none max-sm:w-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:bg-[color:var(--jd-page)] max-sm:shadow-none",
            // A dialog is a tiny app shell: a bounded height, a column, and ONE scroll region
            // inside it. `overflow-y-auto` on the panel itself would scroll the header away
            // with the content — including the close button, which is the only way out on a
            // short viewport.
            "flex max-h-[calc(100dvh-2rem)] flex-col rounded-[var(--radius-jd-xl)]",
            "text-[color:var(--jd-ink)]",
            // OPAQUE (the 2026-08-23 report), on the raised material with the overlay's edge and shadow.
            "bg-[color:var(--jd-raised)] shadow-[var(--jd-shadow-overlay)]",
            "data-[state=open]:animate-jd-pop-in data-[state=closed]:animate-jd-pop-out",
            className,
          )}
        >
          <div className="flex flex-row shrink-0 items-start justify-between gap-4 p-6 pb-2 max-sm:flex-row-reverse max-sm:justify-end max-sm:p-4 max-sm:pb-2">
            <div className="min-w-0 max-sm:flex-1">
              {kicker && (
                <div className="flex flex-row items-center gap-2 font-[family-name:var(--font-jd-kicker)] text-[11px] font-bold uppercase tracking-[0.16em] text-[color:var(--jd-faint)]">
                  {/* The product the person is signing in from: the frame travels with it. */}
                  <ProductSeal brand={brand} size={20} />
                  {kicker}
                </div>
              )}
              <DialogPrimitive.Title
                className={cn(typeClass("display-s"), "text-[color:var(--jd-ink)]", kicker && "mt-3")}
              >
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <p className={cn(typeClass("body-m"), "mt-1.5 italic text-[color:var(--jd-muted)]")}>
                  {subtitle}
                </p>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton aria-label="Close" className="-mr-2 -mt-1">
                <Glyph name="x" size={18} />
              </IconButton>
            </DialogPrimitive.Close>
          </div>

          {/*
            The scroll region, and the only one. `min-h-0` is what makes it work at all: a flex
            child defaults to `min-height: auto`, so without it the body refuses to shrink below
            its content and the panel grows past `max-h` instead of scrolling. `overscroll-contain`
            stops the page behind from scrolling once this reaches its end.

            It also owns the padding, so the scrollbar runs the full height of the content rather
            than being inset by the panel's own — and the gap between the header rule and the
            first thing below it is a `pt-5` here, not a margin the child brings with it.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-4 max-sm:px-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
