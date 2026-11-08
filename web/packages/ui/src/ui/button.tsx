"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../lib/cn";
import { accentFill, type ButtonFill } from "../lib/accent-fill";
import { FOCUS_RING } from "../lib/focus-ring";
import type { SurfaceAccent } from "../surface";
import type { ButtonAxes } from "./button.shared";
import { Spinner } from "./spinner";

/*
 * Button — the ecosystem's control (Lib-Controls § Button: six variants, two registers).
 *
 * VARIANT says what kind of action it is (solid, outline, secondary, accent, ghost, destructive,
 * plus onInk for a control sitting on an ink island); REGISTER says where it lives:
 *
 *   - `cta`, the calm call to action of the website: a pill, the kicker voice (11px, 700,
 *     capitals, +16%), 44 / 52 / 60 tall, and a hover that lifts 2 px. One solid per screen.
 *   - `ui`, the dense control of an app at work: radius 10, the UI voice (14 / 600), 32 / 40 / 48
 *     tall. It changes color on hover and never moves, because a toolbar has many of them.
 *
 * It doesn't know about the router: `asChild` (Radix Slot) lets each app wrap its own `<Link>` and
 * the button contributes the skin. Everything is read from the surface's `--jd-*` tokens, so the same
 * button is right on all four surfaces.
 *
 * States: hover (ink lifts to `--jd-solid-hover`; ghost and outline wash), pressed (98%, 100 ms),
 * focus (the ink ring, 2 px, 2 away), busy (`busy`: the label turns into the verb in progress, the
 * width holds and a second press does nothing) and disabled (a stone fill, ink at 50%, and a reason
 * written beside it by the caller).
 */
export const buttonVariants = cva(
  "relative inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap select-none " +
    // Lift 250 ms, the color and the edge 150 ms. Only transform-like properties and color move.
    "[transition:translate_250ms_var(--ease-jd),scale_100ms_var(--ease-jd),background-color_150ms,box-shadow_150ms] " +
    FOCUS_RING +
    " " +
    // Disabled: the stone fill and the dimmed ink come from the surface, the cursor says why not.
    "disabled:cursor-not-allowed disabled:bg-[color:var(--jd-disabled)] disabled:text-[color:var(--jd-ink)]/50 " +
    "disabled:shadow-none disabled:translate-y-0 motion-safe:disabled:hover:translate-y-0 " +
    "aria-disabled:cursor-not-allowed aria-disabled:bg-[color:var(--jd-disabled)] aria-disabled:text-[color:var(--jd-ink)]/50 " +
    "aria-disabled:shadow-none aria-disabled:translate-y-0 motion-safe:aria-disabled:hover:translate-y-0 " +
    "data-[busy=true]:cursor-progress " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      register: {
        // The lift and the press are MOVEMENT, so they wait for `motion-safe`. Under reduced motion
        // the press is a dim instead: less motion, not none.
        cta:
          "rounded-full motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 " +
          "motion-safe:active:scale-[0.98] motion-reduce:active:opacity-80",
        ui: "rounded-[var(--radius-jd-control)] motion-safe:active:scale-[0.98] motion-reduce:active:opacity-80",
      },
      variant: {
        solid: "bg-[color:var(--jd-ink)] text-[color:var(--jd-page)] hover:bg-[color:var(--jd-solid-hover)]",
        // The edge is the control's ONLY affordance, so it is the 3:1 control border (WCAG 1.4.11).
        outline:
          "bg-transparent text-[color:var(--jd-ink)] shadow-[inset_0_0_0_1px_var(--jd-control-border)] " +
          "hover:bg-[color:var(--jd-ink)]/[0.04] hover:shadow-[inset_0_0_0_1.5px_var(--jd-ink)]",
        secondary:
          "bg-[color:var(--jd-card)] text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-card-hover)]",
        /** Brand accent. The component computes the fill and the ink. */
        accent: "hover:shadow-[inset_0_0_0_1.5px_var(--jd-ink)]",
        ghost: "bg-transparent text-[color:var(--jd-ink)] hover:bg-[color:var(--jd-hover)]",
        destructive: "bg-[color:var(--jd-danger)] text-white hover:bg-[color:var(--jd-danger-hover)]",
        // A control on an ink island (a Theater frame, the account menu over a light page).
        onInk: "bg-white/12 text-white hover:bg-white/20",
      },
      // The scale is per register (see compoundVariants): a row of controls that do not line up is
      // the first thing the eye catches.
      size: { sm: "", md: "", lg: "", icon: "p-0" },
      // Typography is a dimension SEPARATE from color: which voice the label carries has nothing to
      // do with whether the button is solid, outlined, or ghost.
      font: {
        kicker: "font-[family-name:var(--font-jd-kicker)] text-[11px] font-bold uppercase tracking-[0.16em]",
        // A long sentence on a button (the consent bar).
        body: "font-[family-name:var(--font-jd-body)] text-base font-semibold tracking-normal",
        ui: "font-[family-name:var(--font-jd-body)] font-semibold tracking-normal",
      },
    },
    compoundVariants: [
      { register: "cta", size: "sm", className: "min-h-11 px-5" },
      { register: "cta", size: "md", className: "min-h-[52px] px-[26px]" },
      { register: "cta", size: "lg", className: "min-h-[60px] px-[34px]" },
      { register: "cta", size: "icon", className: "size-[52px]" },
      // 32 keeps a 44 px hit area on touch: the visible size never changes, the area around it does.
      {
        register: "ui",
        size: "sm",
        className:
          "min-h-8 px-3 text-[13px] rounded-[var(--radius-jd-sm)] " +
          "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5 pointer-coarse:after:content-['']",
      },
      { register: "ui", size: "md", className: "min-h-10 px-4 text-sm" },
      { register: "ui", size: "lg", className: "min-h-12 px-5 text-[15px]" },
      { register: "ui", size: "icon", className: "size-10 pointer-coarse:size-11" },
    ],
    defaultVariants: { variant: "solid", size: "md", register: "cta" },
  },
);

export type ButtonProps = ButtonBaseProps &
  (
    | {
        fill?: "flat";
        /** Flat fill for `variant="accent"`. If not passed, uses the surface's accent (`--jd-accent`). */
        accent?: string;
      }
    | {
        /**
         * Read only by `variant="accent"`; `flat` (the default) paints the middle stop. `gradient`
         * paints the product's solid accent ink with a white label at 4.5:1 (`buttonFill`, owner
         * answer X08, Option 1). Needs three stops, so
         * `accent` is the `accentFor(slug)` shape. There is no native twin: React Native has no
         * `linear-gradient`.
         */
        fill: "gradient";
        accent?: SurfaceAccent;
      }
  );

interface ButtonBaseProps extends Omit<React.ComponentProps<"button">, "color">, ButtonAxes {
  /**
   * The press is under way: a spinner leads the label (which the caller words as the verb in
   * progress), `aria-busy` tells assistive tech, the width holds and a second press does nothing.
   */
  busy?: boolean;
}

// React 19: `ref` travels as a normal prop (no forwardRef); with
// `React.ComponentProps<"button">` the type fits both `<button>` and Slot.
export function Button({
  className,
  variant,
  size,
  font,
  register = "cta",
  asChild = false,
  busy = false,
  accent,
  fill,
  style,
  onClick,
  children,
  ...props
}: ButtonProps) {
  // `React.ElementType` avoids the Slot/<button> type clash caused by @types/react's
  // dual identity (Slot augments CSSProperties with `--radix-*`).
  const Comp: React.ElementType = asChild ? Slot : "button";

  // A disabled accent button drops its fill: an inline style would beat the disabled classes.
  const accentStyle =
    variant === "accent" && !props.disabled && props["aria-disabled"] !== true
      ? { ...accentFill(fill as ButtonFill, accent), ...style }
      : style;

  return (
    <Comp
      // The voice follows the register unless the caller overrides it. cva cannot express a
      // default that depends on another variant.
      className={cn(
        buttonVariants({ variant, size, register, font: font ?? (register === "ui" ? "ui" : "kicker"), className }),
      )}
      style={accentStyle}
      aria-busy={busy || undefined}
      data-busy={busy || undefined}
      data-jd-component="Button"
      onClick={busy ? (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick}
      {...props}
    >
      {asChild ? (
        // Slot needs exactly one element child: no spinner beside it.
        children
      ) : (
        <>
          {busy ? <Spinner /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}
