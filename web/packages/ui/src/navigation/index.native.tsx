/**
 * `@javadaba/ui/navigation` on Android: the same names as `index.tsx`, on expo-router.
 *
 * Each miniapp is its own navigator, so routes carry no basePath; an App Link into the product's
 * URL space is mapped by `appPathFromUrl` from the app's `+native-intent` (`redirectSystemPath`).
 *
 * Not type-checked by `packages/ui`'s `tsc` (its tsconfig excludes `*.native.tsx`): the Android
 * app's (`packages/apps/android-skeleton`, JAVA-99) is, with `pnpm --filter @javadaba/android-skeleton lint`.
 */
import { Link as RouterLink, useLocalSearchParams, usePathname as useRouterPathname, useRouter as useExpoRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";

export { appPathFromUrl, webUrlFor } from "./paths";

type LinkProps = {
  href: string;
  replace?: boolean;
  /** Web-only hints Next reads; accepted so a screen's JSX is the same on both runtimes. */
  prefetch?: boolean;
  scroll?: boolean;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
} & Omit<ComponentProps<typeof RouterLink>, "href" | "replace" | "children" | "className" | "onPress">;

export function Link({ href, replace, prefetch: _prefetch, scroll: _scroll, onClick, children, ...rest }: LinkProps) {
  return (
    <RouterLink href={href} replace={replace} onPress={onClick} {...rest}>
      {children}
    </RouterLink>
  );
}

/** Next's `AppRouterInstance` surface. `refresh`/`prefetch` have no meaning in a native stack. */
export function useRouter() {
  const router = useExpoRouter();
  return useMemo(
    () => ({
      push: (href: string) => router.push(href),
      replace: (href: string) => router.replace(href),
      back: () => router.back(),
      forward: () => {},
      refresh: () => {},
      prefetch: (_href: string) => {},
    }),
    [router],
  );
}

/** Android has no address bar: nothing to replace. */
export function replaceAddress(_path: string): void {}

export const usePathname = useRouterPathname;

/** Next hands out `URLSearchParams`; expo-router an object. The screen keeps reading `.get()`. */
export function useSearchParams(): URLSearchParams {
  const params = useLocalSearchParams();
  return useMemo(() => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      for (const one of Array.isArray(value) ? value : [value]) if (one !== undefined) search.append(key, String(one));
    return search;
  }, [params]);
}
