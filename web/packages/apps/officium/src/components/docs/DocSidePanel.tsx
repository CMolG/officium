import type { ReactNode } from "react";

/**
 * A panel in the page's side column (JAVA-1537): from `lg` a column beside the text that scrolls on its own, below it
 * a drawer from the right that Escape or a tap outside closes. Escape pressed in a dialog the panel opened (it portals
 * out of the panel) is the dialog's, not the panel's.
 */
export function DocSidePanel({ label, testId, onClose, children }: { label: string; testId: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <button type="button" aria-label={`Close ${label.toLowerCase()}`} onClick={onClose} className="fixed inset-0 z-[100] animate-jd-fade-in bg-[color:var(--jd-scrim)] lg:hidden" />
      <aside
        aria-label={label}
        data-testid={testId}
        onKeyDown={(event) => {
          if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) onClose();
        }}
        className="flex flex-col overflow-y-auto overscroll-contain border-[color:var(--jd-line)] bg-[color:var(--jd-page)] p-3 max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-[101] max-lg:w-96 max-lg:max-w-[90%] max-lg:animate-jd-slide-in-right max-lg:border-l lg:w-96 lg:shrink-0 lg:border-l lg:pb-6"
      >
        {children}
      </aside>
    </>
  );
}
