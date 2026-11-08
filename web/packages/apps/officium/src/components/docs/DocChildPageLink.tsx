import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocTreeNode } from "../../lib/backlog/types";
import { DocNodeIcon } from "./DocNodeIcon";

/** A page under the open one: its icon and its title, a link. */
export function DocChildPageLink({ projectId, node }: { projectId: string; node: DocTreeNode }) {
  return (
    <Link
      href={docsPath(projectId, node.path)}
      className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-sm underline-offset-2 hover:underline"
    >
      <DocNodeIcon icon={node.icon} color={node.iconColor} isSection={false} />
      <span className="min-w-0 break-words">{node.name}</span>
    </Link>
  );
}
