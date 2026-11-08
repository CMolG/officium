"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import { Text } from "./text";

/*
 * A sidebar that folds to an icon rail (JAVA-117): the folded/unfolded choice, remembered per
 * browser, and the button that flips it. The rail itself stays each app's -- widths, colours and
 * entries differ -- but the STATE is one, because two readers need it at once: the sidebar, which
 * hides its labels, and the layout, which moves its content over. Tributa used to keep two
 * copies and poll `localStorage` every 300 ms to reconcile them.
 */

const choices = new Map<string, boolean>();
// A visit is a section with its own second-level sidebar holding the fold (JAVA-1768). It is kept apart from
// `choices`, so the saved choice survives every visit; `holders` counts the mounts that keep the visit alive.
type Visit = { section: string; holders: number; folded: boolean };
const visits = new Map<string, Visit>();
const listeners = new Set<() => void>();

function stored(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    // No storage (a private window, blocked site data, Android): the sidebar starts unfolded.
    return false;
  }
}

function snapshot(key: string): boolean {
  const visit = visits.get(key);
  if (visit) return visit.folded;
  if (!choices.has(key)) choices.set(key, stored(key));
  return choices.get(key)!;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function choose(key: string, collapsed: boolean): void {
  choices.set(key, collapsed);
  try {
    localStorage.setItem(key, String(collapsed));
  } catch {
    // Not persisted, but it still holds for the rest of this page's life (`choices`).
  }
  notify();
}

/** A person's own fold. During a visit it answers the visit and leaves the saved choice alone. */
function setFolded(key: string, collapsed: boolean): void {
  const visit = visits.get(key);
  if (!visit) return choose(key, collapsed);
  visit.folded = collapsed;
  notify();
}

/** A section takes the visit: the sidebar folds, whatever the previous section left it as. */
function enter(key: string, section: string): void {
  const visit = visits.get(key);
  if (visit?.section === section) visit.holders++;
  else visits.set(key, { section, holders: 1, folded: true });
  notify();
}

function leave(key: string, section: string): void {
  const visit = visits.get(key);
  if (visit?.section !== section || --visit.holders > 0) return;
  visits.delete(key);
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether the sidebar under `storageKey` is folded. Every caller with the same key sees the same
 * value and re-renders when it changes. The server renders it unfolded; a stored fold applies
 * right after hydration, as it always did.
 */
export function useSidebarCollapsed(storageKey: string) {
  const collapsed = useSyncExternalStore(subscribe, () => snapshot(storageKey), () => false);
  return {
    collapsed,
    setCollapsed: (next: boolean) => setFolded(storageKey, next),
    toggle: () => setFolded(storageKey, !collapsed),
  };
}

/**
 * A section with its own second-level sidebar takes the visit (JAVA-1768): the sidebar under `storageKey` folds
 * while the section is on screen, the person's own toggle answers that visit, and leaving restores the saved
 * choice. `section` names the section (its fold key): moving between its pages keeps the visit, and entering
 * another section folds again, even from an expanded sidebar.
 */
export function useYieldSidebar(storageKey: string, section: string): void {
  useLayoutEffect(() => {
    enter(storageKey, section);
    // One microtask late: React unmounts before it mounts, and a section remounted in the same commit (the
    // documentation layout remounts on a project switch) keeps its visit.
    return () => {
      queueMicrotask(() => leave(storageKey, section));
    };
  }, [storageKey, section]);
}

export interface SidebarCollapseToggleProps {
  storageKey: string;
  /** Shown beside the icon while unfolded, and the button's name. */
  collapseLabel?: string;
  /** The button's name (and tooltip) while folded, when only the icon shows. */
  expandLabel?: string;
  /**
   * What the layout shows folded. Defaults to the choice. A consumer that folds later than the choice
   * passes its own state, so the label keeps its room until the layout has room to fold.
   */
  folded?: boolean;
  iconSize?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * The fold button. A real `<button>`, so Enter and Space work where Tab reaches it; its name follows the
 * state in both directions, and the glyph turns (`PanelGlyph`) while the label slides into or out of it.
 * The label is `aria-hidden`: the name is the button's, so it never lags the motion.
 */
export function SidebarCollapseToggle({
  storageKey,
  collapseLabel = "Collapse sidebar",
  expandLabel = "Expand sidebar",
  folded: laidOutFolded,
  iconSize = 20,
  strokeWidth = 2,
  className,
}: SidebarCollapseToggleProps) {
  const { collapsed, toggle } = useSidebarCollapsed(storageKey);
  const windowFolded = laidOutFolded ?? collapsed;
  return (
    <button
      type="button"
      aria-expanded={!collapsed}
      aria-label={collapsed ? expandLabel : collapseLabel}
      onClick={toggle}
      title={collapsed ? expandLabel : undefined}
      className={className}
    >
      <PanelGlyph folded={collapsed} size={iconSize} strokeWidth={strokeWidth} />
      {/* A window that clips the label: it keeps its width until the layout folds (`windowFolded`), then closes. */}
      <span aria-hidden className={`flex flex-row overflow-clip ${windowFolded ? "w-0" : ""}`}>
        <Text
          className={`whitespace-nowrap transition-transform duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] motion-reduce:transition-none [[data-capability=low]_&]:transition-none ${
            collapsed ? "-translate-x-full" : "translate-x-0 delay-[var(--jd-dur-base)]"
          }`}
        >
          {collapseLabel}
        </Text>
      </span>
    </button>
  );
}

/**
 * lucide's `PanelLeft`/`PanelLeftClose`, drawn here: `@javadaba/ui` does not depend on `lucide-react` (see
 * `SocialGlyph` in `social-glyph.tsx`), and these are three shapes. The chevron is always drawn and turns
 * half a circle about its own centre, so folded it points the other way instead of appearing and vanishing.
 */
function PanelGlyph({ folded, size, strokeWidth }: { folded: boolean; size: number; strokeWidth: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path
        d="m16 15-3-3 3-3"
        style={{ transformOrigin: "14.5px 12px" }}
        className={`transition-transform duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] motion-reduce:transition-none [[data-capability=low]_&]:transition-none ${
          folded ? "rotate-180" : "rotate-0 delay-[var(--jd-dur-base)]"
        }`}
      />
    </svg>
  );
}
