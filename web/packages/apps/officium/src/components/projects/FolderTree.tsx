"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronRight, Folder as FolderIcon, FolderOpen, LayoutGrid } from "lucide-react";

import { menuTarget, MoreButton } from "@javadaba/ui/feedback";

import type { Folder } from "../../lib/backlog/types";
import { FOLDER_MENU_KIND } from "./folder-menu-entries";

export interface FolderTreeProps {
  folders: Folder[];
  /** `null` selects the pseudo-root "All projects". */
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
}

interface VisibleItem {
  id: string | null;
  name: string;
  depth: number;
  hasChildren: boolean;
}

/**
 * A keyboard-only-navigable folder tree (JDB-225 acceptance criterion), following the ARIA APG
 * treeview pattern: roving `tabIndex` (one item at a time is a tab stop), `ArrowUp`/`ArrowDown`
 * move between VISIBLE items regardless of depth, `ArrowRight` expands (or moves into the first
 * child), `ArrowLeft` collapses (or moves to the parent), `Home`/`End` jump to the ends,
 * `Enter`/`Space` selects. No mouse required for any of it -- `onClick` is additive, not a
 * fallback the keyboard path depends on.
 */
export function FolderTree({ folders, selectedFolderId, onSelect }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((f) => f.id)));
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Folder[]>();
    for (const f of folders) {
      const list = map.get(f.parentId) ?? [];
      list.push(f);
      map.set(f.parentId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [folders]);

  const visible = useMemo(() => {
    const out: VisibleItem[] = [{ id: null, name: "All projects", depth: 0, hasChildren: false }];
    function walk(parentId: string | null, depth: number) {
      for (const f of childrenOf.get(parentId) ?? []) {
        const hasChildren = (childrenOf.get(f.id)?.length ?? 0) > 0;
        out.push({ id: f.id, name: f.name, depth, hasChildren });
        if (hasChildren && expanded.has(f.id)) walk(f.id, depth + 1);
      }
    }
    walk(null, 1);
    return out;
  }, [childrenOf, expanded]);

  function focus(id: string | null) {
    itemRefs.current.get(id ?? "__root__")?.focus();
  }

  function move(delta: number, fromId: string | null) {
    const idx = visible.findIndex((v) => v.id === fromId);
    const next = visible[Math.max(0, Math.min(visible.length - 1, idx + delta))];
    if (next) focus(next.id);
  }

  function onKeyDown(e: React.KeyboardEvent, item: VisibleItem) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1, item.id);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1, item.id);
        break;
      case "ArrowRight":
        e.preventDefault();
        if (item.id && item.hasChildren && !expanded.has(item.id)) {
          setExpanded((s) => new Set(s).add(item.id as string));
        } else {
          move(1, item.id);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (item.id && expanded.has(item.id)) {
          setExpanded((s) => {
            const next = new Set(s);
            next.delete(item.id as string);
            return next;
          });
        } else if (item.id) {
          focus(folders.find((f) => f.id === item.id)?.parentId ?? null);
        }
        break;
      case "Home":
        e.preventDefault();
        focus(visible[0]?.id ?? null);
        break;
      case "End":
        e.preventDefault();
        focus(visible[visible.length - 1]?.id ?? null);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        onSelect(item.id);
        break;
    }
  }

  return (
    <div role="tree" aria-label="Folders" className="flex flex-col gap-0.5">
      {visible.map((item) => {
        const key = item.id ?? "__root__";
        const selected = selectedFolderId === item.id;
        const isExpanded = item.id ? expanded.has(item.id) : true;
        return (
          <div
            key={key}
            ref={(el) => {
              if (el) itemRefs.current.set(key, el);
              else itemRefs.current.delete(key);
            }}
            role="treeitem"
            aria-level={item.depth + 1}
            aria-expanded={item.hasChildren ? isExpanded : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, item)}
            onClick={() => {
              onSelect(item.id);
              focus(item.id);
            }}
            // A folder answers a right-click and a long press, and its More actions sits in the row's corner.
            {...(item.id ? menuTarget(FOLDER_MENU_KIND, item.id) : {})}
            style={{ paddingLeft: `${item.depth * 16 + 8}px` }}
            className={`relative flex flex-row cursor-pointer items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 py-1.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--jd-ink)]/40 ${
              selected ? "bg-[color:var(--jd-ink)]/[0.08] font-semibold" : "hover:bg-[color:var(--jd-ink)]/[0.04]"
            }`}
          >
            {item.hasChildren && item.id !== null && (
              <ChevronRight
                size={14}
                className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                aria-hidden="true"
              />
            )}
            {item.id === null ? (
              <LayoutGrid size={14} className="shrink-0" aria-hidden="true" />
            ) : isExpanded ? (
              <FolderOpen size={14} className="shrink-0" aria-hidden="true" />
            ) : (
              <FolderIcon size={14} className="shrink-0" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate">{item.name}</span>
            {item.id && (
              // Not part of the row's own press: the row selects the folder, this opens its menu.
              <span className="shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <MoreButton aria-label={`More actions for ${item.name}`} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
