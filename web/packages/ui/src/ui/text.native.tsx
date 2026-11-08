import type { ReactNode } from "react";
import { Text as NativeText } from "react-native";

import { headingLevel, textClasses, type TextAxes } from "./text.shared";

/*
 * Text on Android: React Native's `<Text>` with the same classes the web renders (NativeWind v5
 * reads `className`). A heading has no `<h*>` here, so it keeps its level as role + aria-level.
 *
 * Not type-checked by `packages/ui`'s `tsc` (its tsconfig excludes `*.native.tsx`): the Android
 * app's (`packages/apps/android-skeleton`, JAVA-99) is, with `pnpm --filter @javadaba/android-skeleton lint`.
 */

export type TextProps = TextAxes & { children?: ReactNode; id?: string; "aria-label"?: string };

export function Text({ as, type, size, tone, weight, font, className, children, ...rest }: TextProps) {
  const level = headingLevel(as);
  return (
    <NativeText
      // What the browser gives `<strong>` and `<em>` for free, Android has to be told.
      className={textClasses({
        type, size, tone, weight: weight ?? (as === "strong" ? "bold" : undefined), font,
        className: as === "em" ? `italic ${className ?? ""}` : className,
      })}
      role={level ? "heading" : undefined}
      aria-level={level}
      {...rest}
    >
      {children}
    </NativeText>
  );
}

export { textClasses, type TextAxes, type TextElement } from "./text.shared";
