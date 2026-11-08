"use client";

import * as React from "react";

import { ContextMenu, type ContextMenuRequest } from "../ui/context-menu";
import { MenuEntries } from "./MenuEntries";
import { MenuOpenerContext } from "./menu-registry";
import type { MenuContext, MenuEntry, MenuPoint } from "./menu-model";

export interface FramedMenuProps {
  /** Selector of the transformed ancestor the menu lives in (a Theater layer). */
  frame: string;
  "aria-label": string;
  /** The rows for what opened the menu, at the frame's point. */
  menuFor: (target: Element, point: MenuPoint) => { entries: MenuEntry[]; ctx: MenuContext };
  children: React.ReactNode;
}

interface Opened {
  point: MenuPoint;
  target: Element;
  /** The scaled frame the menu was opened in: the menu is kept inside it, not inside the viewport. */
  boundary: HTMLElement | null;
}

/**
 * A menu a control opens inside a scaled frame, such as a Theater scene's "More" button (JAVA-1729). The root
 * menu would open on `body`, outside the frame's transform; there `position: fixed` is relative to the frame, so
 * this host converts the gesture's point into the frame's own coordinates and keeps the menu inside it. Its rows
 * are the caller's, drawn through the same entries as every other menu of the layer.
 */
export function FramedMenu({ frame, "aria-label": label, menuFor, children }: FramedMenuProps) {
  const [opened, setOpened] = React.useState<Opened | null>(null);

  const open = React.useCallback(
    (request: ContextMenuRequest) => {
      const layer = request.target.closest<HTMLElement>(frame);
      if (!layer) {
        setOpened({ point: { x: request.x, y: request.y }, target: request.target, boundary: null });
        return;
      }
      const box = layer.getBoundingClientRect();
      const scale = box.width / layer.offsetWidth || 1;
      setOpened({
        point: { x: (request.x - box.left) / scale, y: (request.y - box.top) / scale },
        target: request.target,
        boundary: layer,
      });
    },
    [frame],
  );

  const menu = opened ? menuFor(opened.target, opened.point) : null;

  return (
    <MenuOpenerContext.Provider value={open}>
      {children}
      <ContextMenu
        point={opened?.point ?? null}
        onClose={() => setOpened(null)}
        collisionBoundary={opened?.boundary ?? undefined}
        aria-label={label}
      >
        {menu && <MenuEntries entries={menu.entries} ctx={menu.ctx} />}
      </ContextMenu>
    </MenuOpenerContext.Provider>
  );
}
