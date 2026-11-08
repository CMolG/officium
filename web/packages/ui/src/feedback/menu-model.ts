import type * as React from "react";

/*
 * The one context-menu model (JAVA-1182, adr/0029): a menu is DATA. An app declares providers keyed
 * by the kind of thing pointed at; the layer draws every row, so the cognitive floor (a reason on a
 * disabled row, danger in a token beside a verb, a tick that is announced) lives in the type and
 * not in each caller. Providers by target kind and the world position are reimplemented from
 * fluxor-ide feat/cockpit src/renderer/components/desktop/SeamlessCanvas.tsx (Apache-2.0).
 */

export interface MenuPoint {
  x: number;
  y: number;
}

/** What a provider is told when the menu opens. */
export interface MenuContext {
  /** The kind of the nearest marked target, or `null` for the scope's background. */
  targetKind: string | null;
  targetId: string | null;
  /** Where the gesture happened, in viewport coordinates. */
  point: MenuPoint;
  /** The point in the surface's own coordinates (a canvas's world), when the scope can convert. */
  worldPos: MenuPoint | null;
  target: Element;
}

export interface ItemEntry {
  kind?: "item";
  id: string;
  label: string;
  onSelect: (ctx: MenuContext) => void;
  icon?: React.ReactNode;
  /** The keyboard shortcut that does the same, shown on the right. */
  shortcut?: string;
  /** A tick in the icon column, announced as a checkable row. */
  checked?: boolean;
  /** `danger` draws the label in the destructive token; the label must still name the act. */
  tone?: "danger";
  /** Disables the row and says why under its label. There is no disabling without a reason. */
  disabledReason?: string;
  note?: string;
  testId?: string;
}

export interface LabelEntry {
  kind: "label";
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ChoiceEntry {
  kind: "choice";
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string; disabledReason?: string; testId?: string }[];
  onChange: (value: string, ctx: MenuContext) => void;
}

export interface PendingEntry {
  kind: "pending";
  id: string;
  /** Rows that load after the menu opened (spelling suggestions). */
  load: () => Promise<MenuEntry[]>;
  labels: { loading: string; empty: string; failed: string };
}

export interface GroupEntry {
  kind: "group";
  id: string;
  entries: MenuEntry[];
  testId?: string;
}

export type MenuEntry = ItemEntry | LabelEntry | ChoiceEntry | PendingEntry | GroupEntry;

export type MenuProvider = (ctx: MenuContext) => MenuEntry[];
export type MenuProviders = Record<string, MenuProvider>;

/** The providers key used when no target inside the scope is marked. */
export const MENU_BACKGROUND = "background";

const KIND_ATTR = "data-jd-menu-kind";
const ID_ATTR = "data-jd-menu-id";
export const MENU_SCOPE_ATTR = "data-jd-menu-scope";

/** Spread on an element to make it a target a scope's provider answers for. */
export const menuTarget = (kind: string, id: string) => ({ [KIND_ATTR]: kind, [ID_ATTR]: id });

export interface MenuScopeConfig {
  providers: MenuProviders;
  label?: string | ((ctx: MenuContext) => string);
  toWorld?: (point: MenuPoint) => MenuPoint;
  /**
   * Over a marked target, the scope's background entries follow the target's as a second labelled group
   * under this name ("Board": New card here). Without it a marked target shows its own entries alone.
   */
  backgroundLabel?: string;
}

/** The second labelled group of a menu: the area one level out from the target (never more than two levels). */
export interface OuterGroup {
  label: string;
  entries: MenuEntry[];
}

export interface ResolvedMenu {
  entries: MenuEntry[];
  label: string | null;
  ctx: MenuContext;
  outer: OuterGroup | null;
}

/**
 * The nearest scope from the target, then the nearest mark INSIDE that scope. A mark in an outer
 * scope never answers for an inner one. Pure: the scopes are looked up through `scopeOf`.
 */
export function resolveMenu(
  target: Element,
  point: MenuPoint,
  scopeOf: (id: string) => MenuScopeConfig | undefined,
): ResolvedMenu | null {
  const scopeEl = target.closest(`[${MENU_SCOPE_ATTR}]`);
  const config = scopeEl ? scopeOf(scopeEl.getAttribute(MENU_SCOPE_ATTR) ?? "") : undefined;
  if (!scopeEl || !config) return null;

  let mark = target.closest(`[${KIND_ATTR}]`);
  while (mark && mark.closest(`[${MENU_SCOPE_ATTR}]`) !== scopeEl) {
    mark = mark.parentElement?.closest(`[${KIND_ATTR}]`) ?? null;
  }
  const targetKind = mark?.getAttribute(KIND_ATTR) ?? null;
  const targetId = mark?.getAttribute(ID_ATTR) ?? null;
  const ctx: MenuContext = { targetKind, targetId, point, worldPos: config.toWorld?.(point) ?? null, target };
  const provider = config.providers[targetKind ?? MENU_BACKGROUND];
  const label = typeof config.label === "function" ? config.label(ctx) : (config.label ?? null);
  const background = mark && config.backgroundLabel ? config.providers[MENU_BACKGROUND] : undefined;
  const outer = background ? { label: config.backgroundLabel as string, entries: background({ ...ctx, targetKind: null, targetId: null }) } : null;
  return { entries: provider?.(ctx) ?? [], label, ctx, outer: outer && outer.entries.length > 0 ? outer : null };
}
