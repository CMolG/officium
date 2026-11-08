import type { ReactNode } from "react";

/**
 * A section heading of the modal. Its weight -- `font-bold` at the small size, like TIME LOG -- is
 * the reference the whole modal's type follows (user decision, 2026-09-23: title, estimate and
 * priority were heavier than it and read as shouting).
 */
export function SectionHeading({ icon, children, trailing }: { icon: ReactNode; children: ReactNode; trailing?: ReactNode }) {
  return (
    <h3 className="flex flex-row items-center gap-2 border-b border-[color:var(--jd-line)] pb-2 text-sm font-bold uppercase tracking-wide">
      {icon} {children}
      {trailing}
    </h3>
  );
}
