import type { ReactNode } from "react";
import { Text } from "@javadaba/ui";

/** One block of a Configuration page: a title (with an optional count or note beside it), a hint, then the content. */
export function ConfigSection({
  title,
  note,
  hint,
  label,
  children,
}: {
  title: ReactNode;
  note?: ReactNode;
  hint?: ReactNode;
  /** The region's accessible name when the title is not text. */
  label?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={label ?? (typeof title === "string" ? title : undefined)}>
      <div className="flex flex-col gap-1">
        <h2 className="flex flex-row flex-wrap items-baseline gap-2 text-base font-bold">
          <Text>{title}</Text>
          {note && <Text className="text-xs font-medium text-[color:var(--jd-muted)]">{note}</Text>}
        </h2>
        {hint && (
          <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
            {hint}
          </Text>
        )}
      </div>
      {children}
    </section>
  );
}
