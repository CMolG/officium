import type { ReactNode } from "react";
import { X } from "lucide-react";

/**
 * A sidebar on a phone (JAVA-131, lifted by JAVA-1626): a drawer behind the section's button, closed by its
 * button, by Escape or by tapping outside it. `title` names the sidebar for its region and its heading.
 */
export function SidebarDrawer({
  title,
  closeLabel,
  testId,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  testId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="fixed inset-0 z-[100] animate-jd-fade-in bg-[color:var(--jd-scrim)] md:hidden"
      />
      <nav
        aria-label={title}
        data-testid={testId}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="fixed inset-y-0 left-0 z-[101] flex w-72 max-w-[85%] flex-col gap-3 overflow-y-auto overscroll-contain border-r border-[color:var(--jd-line)] bg-[color:var(--jd-page)] p-3 max-md:animate-jd-slide-in-left md:hidden"
      >
        <div className="flex flex-row items-center justify-between gap-2">
          <p className="text-sm font-bold">{title}</p>
          <button
            type="button"
            autoFocus
            aria-label={closeLabel}
            onClick={onClose}
            className="flex size-11 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
      </nav>
    </>
  );
}
