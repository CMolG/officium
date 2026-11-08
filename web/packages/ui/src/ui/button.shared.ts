/*
 * What `Button` means on both runtimes: the names of its axes and the props a call site passes.
 * `button.tsx` (web) and `button.native.tsx` (Android) take them from here, so the two cannot
 * drift; the classes stay in each half, because the web's `focus-visible:`, `motion-safe:` and
 * `[&_svg]` selectors do not exist on native.
 */

/** `onInk` is the control that sits on an ink island (a Theater frame, an account menu). */
export type ButtonVariant = "solid" | "outline" | "secondary" | "accent" | "ghost" | "destructive" | "onInk";
export type ButtonSize = "sm" | "md" | "lg" | "icon";
/** `cta` is the call-to-action pill (44 / 52 / 60), `ui` the app control (32 / 40 / 48). */
export type ButtonRegister = "cta" | "ui";
export type ButtonFont = "kicker" | "body" | "ui";

export interface ButtonAxes {
  variant?: ButtonVariant | null;
  size?: ButtonSize | null;
  register?: ButtonRegister | null;
  font?: ButtonFont | null;
  /**
   * Renders the child instead of the control, keeping the skin: each app's `<Link>` gets passed
   * through without the system knowing about any router.
   */
  asChild?: boolean;
  className?: string;
}
