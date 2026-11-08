"use client";

import type { ReactNode } from "react";

import type { DocTreeNode } from "../../lib/backlog/types";
import { DocDropPlaceholder } from "./DocDropPlaceholder";
import type { DocTreeShared } from "./doc-tree-shared";
import { DocTreeRow } from "./DocTreeRow";

/**
 * The siblings under one node (JAVA-791). While a row is dragged, the placeholder (JAVA-1550) is inserted
 * here, at its planned index among the rows that are not the dragged one, when this group is its parent.
 * A drop can go in any group (JAVA-792): `DocTree` reads where, and a group sorted A to Z files a drop by name.
 */
export function DocTreeGroup({
  nodes,
  parent,
  level,
  shared,
}: {
  nodes: DocTreeNode[];
  /** The path of the node these are children of; "" is the top level. */
  parent: string;
  level: number;
  shared: DocTreeShared;
}) {
  const slot = shared.slot?.parent === parent ? shared.slot : null;
  const items: ReactNode[] = [];
  let seen = 0;
  for (const node of nodes) {
    if (node.path !== shared.dragging) {
      if (slot && seen === slot.index) items.push(<DocDropPlaceholder key="drop-placeholder" slot={slot} />);
      seen += 1;
    }
    // A leaf or a collapsed folder the row is dragged into still shows its placeholder under it.
    const open = node.children.length > 0 && !shared.collapsed.has(node.path);
    const receiving = shared.slot?.parent === node.path;
    items.push(
      <DocTreeRow key={node.path} node={node} level={level} shared={shared}>
        {(open || receiving) && (
          <div className="ml-4 border-l border-[color:var(--jd-line)] pl-1">
            <DocTreeGroup nodes={open ? node.children : []} parent={node.path} level={level + 1} shared={shared} />
          </div>
        )}
      </DocTreeRow>,
    );
  }
  if (slot && seen <= slot.index) items.push(<DocDropPlaceholder key="drop-placeholder" slot={slot} />);
  return (
    <div role={level === 1 ? undefined : "group"} className="flex flex-col gap-0.5">
      {items}
    </div>
  );
}
