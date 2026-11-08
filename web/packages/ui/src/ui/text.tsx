import type { HTMLAttributes } from "react";

import { isHandRole } from "../lib/type-scale";
import { textClasses, type TextAxes } from "./text.shared";

/*
 * Text — where a string lives, on the web and on Android.
 *
 * React Native crashes on a string outside `<Text>` (ADR 0015, `rules/native-portability.md`
 * rule 7), and the ratchet counted 552 of them on the ported surfaces: labels in a `<div>`, button
 * and table-cell text. Wrapping each in a bare `<span>` today and in `<Text>` tomorrow is the same
 * edit twice; wrapping it in this piece is the edit once. Metro resolves `./text` to
 * `text.native.tsx` on Android; Next never sees that file.
 *
 * The axes are the system's (type scale, ink tokens, the voice), not free classes. With none set
 * it renders the bare element, so migrating a call site changes nothing on the web.
 */

export type TextProps = TextAxes & Omit<HTMLAttributes<HTMLElement>, "className">;

export function Text({ as: Element = "span", type, size, tone, weight, font, className, ...rest }: TextProps) {
  // The hand repeats what the page already says (Lib-Foundations 04): screen readers skip it unless the caller says otherwise.
  const hidden = isHandRole(type) ? { "aria-hidden": true } : undefined;
  return <Element className={textClasses({ type, size, tone, weight, font, className })} {...hidden} {...rest} />;
}

export { textClasses, type TextAxes, type TextElement } from "./text.shared";
