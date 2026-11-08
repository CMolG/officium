import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { cn } from "../lib/cn";

/*
 * ScrollArea on Android: a `ScrollView` (rule 6 of native-portability: one dedicated, bounded
 * scroll container). The platform draws the scroll indicator, so `ScrollBar` renders nothing and
 * exists only so a web call site that mounts one keeps compiling.
 *
 * Taps reach what they land on while the keyboard is up (`keyboardShouldPersistTaps`), as on the
 * web. React Native's default spends the first tap on hiding the keyboard, and the responder walk
 * crosses a `Modal`, so that default also cost a Dialog's buttons inside it a second press (JAVA-1486).
 */

export { ScrollBar } from "./scroll-bar.native";

export function ScrollArea({
  className,
  children,
  horizontal,
}: {
  className?: string;
  children?: ReactNode;
  horizontal?: boolean;
}) {
  return (
    <ScrollView horizontal={horizontal} keyboardShouldPersistTaps="handled" className={cn("relative", className)}>
      {children}
    </ScrollView>
  );
}
