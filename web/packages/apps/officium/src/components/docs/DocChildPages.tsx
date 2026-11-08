import type { DocTreeNode } from "../../lib/backlog/types";
import { DocChildPageLink } from "./DocChildPageLink";
import { DocNodeIcon } from "./DocNodeIcon";

/** The pages a node holds, nearest first: a child with no page of its own stands for the pages below it. */
function nearestPages(node: DocTreeNode): DocTreeNode[] {
  return node.page ? [node] : node.children.flatMap(nearestPages);
}

/**
 * "Pages under this one" (JAVA-795): the node's children in tree order. A child with no page is a
 * label over its own nearest pages, so nothing below the page is out of reach. Absent when empty.
 */
export function DocChildPages({ projectId, node }: { projectId: string; node: DocTreeNode | null }) {
  const children = node?.children ?? [];
  if (children.every((child) => nearestPages(child).length === 0)) return null;
  return (
    <section aria-label="Pages under this one" className="flex flex-col gap-1 border-t border-[color:var(--jd-line)] pt-4" data-testid="doc-children">
      <h3 className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Pages under this one</h3>
      <ul className="flex flex-col">
        {children.map((child) =>
          child.page ? (
            <li key={child.path}>
              <DocChildPageLink projectId={projectId} node={child} />
            </li>
          ) : (
            <li key={child.path}>
              <p className="flex min-h-8 flex-row items-center gap-2 px-2 text-sm font-medium text-[color:var(--jd-muted)]">
                <DocNodeIcon icon={child.icon} color={child.iconColor} isSection size={14} />
                {child.name}
              </p>
              <ul className="flex flex-col pl-4">
                {nearestPages(child).map((page) => (
                  <li key={page.path}>
                    <DocChildPageLink projectId={projectId} node={page} />
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
