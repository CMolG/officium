import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { Children, isValidElement, type ElementType, type ReactNode } from "react";
import { Pressable, Text as NativeText, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { cn } from "../lib/cn";
import { inkOn } from "../lib/luminance";
import type { ButtonAxes, ButtonVariant } from "./button.shared";

/*
 * Button on Android: a `Pressable` with the web's variants, registers and sizes by name
 * (`button.shared.ts`). The classes are its own: the web's `focus-visible:`, `motion-safe:`,
 * `hover:` and `[&_svg]` selectors do not exist here, and the press is `active:`.
 *
 * Differences a port screen can rely on:
 *   - Text color does not inherit on Android, so a string child is wrapped in a `<Text>` carrying
 *     the variant's ink. Any other child (an icon, a `Text` of its own) brings its own.
 *   - Every size is at least 44 dp, the touch floor (interface-psychology L3); the web's 32-36 px
 *     `ui` register is a declared deviation there only.
 *   - `fill="gradient"` has no twin: React Native has no `linear-gradient` (it would need
 *     `expo-linear-gradient`), and the gradient accent falls back to the flat one.
 *
 * Not type-checked by `packages/ui`'s `tsc` (it excludes `*.native.tsx`): the Android app's is.
 */

export const buttonVariants = cva("flex flex-row items-center justify-center gap-2 min-h-11 min-w-11 active:opacity-80", {
  variants: {
    register: {
      cta: "rounded-full",
      ui: "rounded-[var(--radius-jd-control)]",
    },
    variant: {
      solid: "bg-[color:var(--jd-ink)]",
      outline: "border border-[color:var(--jd-control-border)]",
      secondary: "bg-[color:var(--jd-card)]",
      accent: "bg-[color:var(--jd-accent)]",
      ghost: "",
      destructive: "bg-[color:var(--jd-danger)]",
      onInk: "bg-white/12",
    },
    size: {
      sm: "px-4 py-2",
      md: "px-7 py-3",
      lg: "px-8 py-3.5",
      icon: "p-0 rounded-full",
    },
  },
  compoundVariants: [{ register: "ui", size: "icon", className: "rounded-[var(--radius-jd-control)]" }],
  defaultVariants: { variant: "solid", size: "md", register: "cta" },
});

// Literal strings, so Tailwind's scanner sees every one (`@source` on the native halves).
const INK: Record<ButtonVariant, string> = {
  solid: "text-[color:var(--jd-page)]",
  outline: "text-[color:var(--jd-ink)]",
  secondary: "text-[color:var(--jd-ink)]",
  accent: "text-black",
  ghost: "text-[color:var(--jd-ink)]",
  destructive: "text-white",
  onInk: "text-white",
};
const LABEL_SIZE = { sm: "text-xs", md: "text-sm", lg: "text-sm", icon: "text-sm" } as const;
const VOICE = {
  kicker: "font-[family-name:var(--font-jd-kicker)] font-bold uppercase tracking-[0.16em]",
  body: "font-[family-name:var(--font-jd-body)] font-semibold",
  ui: "font-[family-name:var(--font-jd-body)] font-semibold",
} as const;

export interface ButtonProps extends ButtonAxes, Omit<PressableProps, "children" | "style" | "role"> {
  /** Flat fill for `variant="accent"`; without one, the surface's accent. */
  accent?: string;
  /** Accepted so a web call site moves over; Android paints the flat accent. */
  fill?: "flat" | "gradient";
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  "aria-label"?: string;
}

export function Button({
  className,
  variant,
  size,
  font,
  register,
  asChild = false,
  accent,
  fill: _fill,
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const v = variant ?? "solid";
  const s = size ?? "md";
  const r = register ?? "cta";
  const flat = v === "accent" && accent ? accent : undefined;
  const label = cn(LABEL_SIZE[s], VOICE[font ?? (r === "ui" ? "ui" : "kicker")], INK[v]);
  const labelStyle = flat ? { color: inkOn(flat) } : undefined;
  const Comp: ElementType = asChild ? Slot : Pressable;

  return (
    <Comp
      role="button"
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={cn(buttonVariants({ variant: v, size: s, register: r }), disabled && "opacity-50", className)}
      style={flat ? [{ backgroundColor: flat }, style] : style}
      {...rest}
    >
      {asChild
        ? children
        : Children.map(children, (child) =>
            typeof child === "string" || typeof child === "number" ? (
              <NativeText className={label} style={labelStyle}>
                {child}
              </NativeText>
            ) : isValidElement(child) || child == null ? child : null,
          )}
    </Comp>
  );
}
