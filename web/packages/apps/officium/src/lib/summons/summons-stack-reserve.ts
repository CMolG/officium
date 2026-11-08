/*
 * The summons stack covers the bottom of a phone's board (JAVA-1624). While toasts show on a phone, each
 * board view ends with a spacer as tall as the stack, so its last card scrolls clear of the toasts. The
 * stack keeps its size: nothing is shrunk to make room.
 */

/** One toast is about 120 px tall on a phone; 136 px leaves room for its gap to the next. */
export const TOAST_RESERVE_PX = 136;

/** The stack sits 16 px off the bottom edge (`bottom-4`). */
export const STACK_OFFSET_PX = 16;

/** Below Tailwind's `sm` breakpoint the stack spans the page's width, so the reserve applies only there. */
export const PHONE_WIDTH = 640;

/** The height the stack covers for `count` toasts on screen; 0 when none shows. */
export function stackReserveHeight(count: number): number {
  return count > 0 ? count * TOAST_RESERVE_PX + STACK_OFFSET_PX : 0;
}
