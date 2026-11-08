"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import type { Crumb } from "../../lib/docs/doc-move";
import { DocNodeIcon } from "./DocNodeIcon";

const CRUMB = "-mx-1 flex min-h-11 flex-row items-center break-words px-1";

/**
 * Where a page sits (JAVA-792): its ancestors, then itself. An ancestor with a page of its own is a
 * link, underlined at rest so it reads as one without color; one that only holds pages is plain text,
 * and the page comes last as the current one. Each link is a 44 px target: a breadcrumb is navigation.
 *
 * It has a row of its own (JAVA-1537's review). On a phone a deep path folds its middle ancestors behind a "…" button
 * that unfolds them, so the path takes one line instead of one per ancestor; the current page stays on one line too.
 */
export function DocBreadcrumbs({
  projectId,
  crumbs,
  title,
  current,
}: {
  projectId: string;
  crumbs: Crumb[];
  title: string;
  /** The page's own icon, drawn beside its title (JAVA-1765). */
  current: { icon: string | null; iconColor: string | null };
}) {
  const [unfolded, setUnfolded] = useState(false);
  const foldable = crumbs.length > 2 && !unfolded;
  const hiddenOnPhone = (index: number) => foldable && index > 0 && index < crumbs.length - 1;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0 max-w-full">
      <ol className="flex min-w-0 flex-row flex-wrap items-center gap-x-1 text-xs text-[color:var(--jd-muted)]">
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className={`min-w-0 flex-row items-center gap-1 ${hiddenOnPhone(index) ? "hidden sm:flex" : "flex"}`}>
            {crumb.linked ? (
              <Link
                href={docsPath(projectId, crumb.path)}
                className={`${CRUMB} underline decoration-dotted underline-offset-2 hover:text-[color:var(--jd-ink)] hover:decoration-solid`}
              >
                <DocNodeIcon icon={crumb.icon} color={crumb.iconColor} isSection size={14} />
                <Text>{crumb.name}</Text>
              </Link>
            ) : (
              <span className={CRUMB}>
                <DocNodeIcon icon={crumb.icon} color={crumb.iconColor} isSection size={14} />
                <Text>{crumb.name}</Text>
              </span>
            )}
            <ChevronRight size={12} aria-hidden="true" className="shrink-0" />
            {foldable && index === 0 && (
              <span className="flex flex-row items-center gap-1 sm:hidden">
                <button
                  type="button"
                  onClick={() => setUnfolded(true)}
                  aria-label={`Show the ${crumbs.length - 2} folders in between`}
                  className="flex min-h-11 min-w-11 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] hover:text-[color:var(--jd-ink)]"
                >
                  <Text aria-hidden="true">…</Text>
                </button>
                <ChevronRight size={12} aria-hidden="true" className="shrink-0" />
              </span>
            )}
          </li>
        ))}
        <li aria-current="page" className="flex min-h-11 min-w-0 max-w-full flex-row items-center font-medium text-[color:var(--jd-ink)]">
          <DocNodeIcon icon={current.icon} color={current.iconColor} isSection={false} size={14} />

          <Text className="min-w-0 truncate">{title}</Text>
        </li>
      </ol>
    </nav>
  );
}
