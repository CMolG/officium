"use client";

/**
 * `@javadaba/ui/navigation` — how a screen moves, on both runtimes (JAVA-102, ADR 0015).
 *
 * The web half is Next's own pieces under the seam's names, on purpose: Next already applies the
 * zone's `basePath` to `Link` and strips it from `usePathname`, so there is nothing to add here.
 * What the seam buys is the OTHER half: `index.native.tsx` gives the same names on expo-router, so a
 * ported screen imports this module and never `next/*` or `expo-router` — which is what the
 * native-subset ratchet's `next-navigation` check holds it to.
 *
 * Server-only helpers (`redirect`, `notFound`) are not here: they live in route files, which are
 * Next's alone and are replaced by expo-router screens, not ported.
 */
import { addBasePath } from "next/dist/client/add-base-path";

/**
 * Puts an app route in place of the current history entry, without navigating (JAVA-1417): Next
 * patches `history.replaceState`, so `usePathname` follows and the page stays mounted. The zone's
 * basePath is applied here, so no screen names it.
 */
export function replaceAddress(path: string): void {
  window.history.replaceState(window.history.state, "", addBasePath(path));
}

export { default as Link } from "next/link";
export { usePathname, useRouter, useSearchParams } from "next/navigation";
export { appPathFromUrl, webUrlFor } from "./paths";
