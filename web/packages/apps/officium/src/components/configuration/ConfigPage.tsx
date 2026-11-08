import type { ReactNode } from "react";
import { Text } from "@javadaba/ui";

/**
 * The page every Configuration section wears (Cfg-* artboards): a Doto title, one sentence under it that says what
 * the page decides, then its sections. The sidebar already names the project, so the page does not repeat it.
 */
export function ConfigPage({
  title,
  lede,
  actions,
  wide = false,
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  /** Controls beside the title (a Save, a New team). */
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={`officium-rise mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
      <header className="flex flex-row flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Text as="h1" className="font-[family-name:var(--font-jd-display)] text-[28px] font-bold leading-none tracking-[-0.01em]">
            {title}
          </Text>
          {lede && (
            <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
              {lede}
            </Text>
          )}
        </div>
        {actions}
      </header>
      {children}
    </main>
  );
}
