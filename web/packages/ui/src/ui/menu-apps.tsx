"use client";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import type { ProductAppLink } from "./javadaba-links";
import { useVisibleApps } from "./launcher-audience";
import { NavGroupLabel } from "./nav-group-label";
import { ProductSeal } from "./product-seal";
import { Text } from "./text";

/**
 * The launcher in the Javadaba menu (Lib-Chrome `.la`): the seal over the name, four to a row. The
 * app you are in is marked as the current page, so the grid reads as a map with a "you are here".
 * Always a plain `<a>`: every app is its own Next zone with its own `basePath`, so no app's router
 * can route to another's. It lists what this audience may see (`useVisibleApps`): no B2C app for a visitor but the one they are in.
 */
export function MenuApps({
  apps: all,
  label,
  current,
}: {
  apps: readonly ProductAppLink[];
  label: string;
  current?: string;
}) {
  const apps = useVisibleApps(all, current);
  if (apps.length === 0) return null;
  return (
    <div className="flex flex-col">
      <NavGroupLabel className="pt-1">{label}</NavGroupLabel>
      <ul className="-m-0.5 flex flex-row flex-wrap">
        {apps.map((app) => {
          const here = app.slug === current;
          return (
            <li key={app.slug} className="basis-1/4 p-0.5">
              <a
                href={app.href}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition-colors duration-[var(--jd-dur-fast)]",
                  here ? "bg-[color:var(--jd-card)]" : "hover:bg-[color:var(--jd-hover)]",
                  FOCUS_RING,
                )}
              >
                <ProductSeal brand={app.slug} size={36} />
                <Text className="w-full truncate text-center text-[11px] font-medium text-[color:var(--jd-ink)]">
                  {app.name}
                </Text>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
