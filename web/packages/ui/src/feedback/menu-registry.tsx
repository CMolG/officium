"use client";

import * as React from "react";

import type { ContextMenuRequest } from "../ui/context-menu";
import { MENU_SCOPE_ATTR, resolveMenu, type MenuProviders, type MenuScopeConfig, type ResolvedMenu } from "./menu-model";

/*
 * A surface with a menu of its own (Fabula's page, the canvas, the desktop) does not open it: it
 * declares providers keyed by the kind of thing pointed at, and the layer shows their entries above
 * its own in ONE menu. The scope is a wrapper that stamps an id on the DOM; the layer finds the
 * nearest one from the event's target, so the nearest scope wins and the rest of the page keeps the
 * plain menu.
 */

export interface MenuRegistry {
  register: (id: string, config: () => MenuScopeConfig) => () => void;
  /** The nearest scope's entries for this request, or `null` when the target is in none. */
  resolve: (request: ContextMenuRequest) => ResolvedMenu | null;
}

export function createMenuRegistry(): MenuRegistry {
  const scopes = new Map<string, () => MenuScopeConfig>();
  return {
    register(id, config) {
      scopes.set(id, config);
      return () => {
        if (scopes.get(id) === config) scopes.delete(id);
      };
    },
    resolve(request) {
      return resolveMenu(request.target, request, (id) => scopes.get(id)?.());
    },
  };
}

export const MenuRegistryContext = React.createContext<MenuRegistry | null>(null);

/** Opens the layer's one menu as a right-click on `target` at `point` would; set by `FeedbackContextMenu`. */
export const MenuOpenerContext = React.createContext<((request: ContextMenuRequest) => void) | null>(null);

/**
 * For a visible "More" button (card://JAVA-1530): it opens the same menu a right-click on `target` opens, the
 * scope's entries first, so a surface never draws a menu of its own for a button either. `null` outside a
 * `FeedbackContextMenu`, where there is no menu to open.
 */
export function useFeedbackMenu(): ((target: Element, point: { x: number; y: number }) => void) | null {
  const open = React.useContext(MenuOpenerContext);
  return React.useMemo(() => (open ? (target: Element, point: { x: number; y: number }) => open({ ...point, target }) : null), [open]);
}

export interface FeedbackMenuScopeProps extends Pick<MenuScopeConfig, "label" | "toWorld" | "backgroundLabel"> {
  /** By target kind; `MENU_BACKGROUND` answers when no marked target is under the pointer. */
  providers: MenuProviders;
  children: React.ReactNode;
}

/**
 * A provider is a plain function called when the menu opens: no hooks, and its closures carry the
 * app's strings and state (read through a ref when a click must see state set after it opened).
 * Wrap the area that has its own menu; elements inside mark themselves with `menuTarget`. Outside a
 * `FeedbackContextMenu` it renders its children untouched.
 */
export function FeedbackMenuScope({ providers, label, toWorld, backgroundLabel, children }: FeedbackMenuScopeProps) {
  const registry = React.useContext(MenuRegistryContext);
  const id = React.useId();
  const latest = React.useRef<MenuScopeConfig>({ providers, label, toWorld, backgroundLabel });
  React.useEffect(() => {
    latest.current = { providers, label, toWorld, backgroundLabel };
  });
  React.useEffect(() => registry?.register(id, () => latest.current), [registry, id]);

  if (!registry) return <>{children}</>;
  return (
    <div {...{ [MENU_SCOPE_ATTR]: id }} className="contents">
      {children}
    </div>
  );
}
