import { ArrowRight, FileText } from "lucide-react";
import { Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import { relatedPagePath } from "../../lib/docs/doc-links";

/** The page's related pages (JAVA-1551): a row per page, named by its title when the project has it, each a 44 px
 *  target. A target that is not a page of this project stays visible as written, never dropped. */
export function DocRelatedPages({
  projectId,
  path,
  related,
  titles,
}: {
  projectId: string;
  path: string;
  related: string[];
  titles: ReadonlyMap<string, string>;
}) {
  return (
    <nav aria-label="Related pages" className="flex flex-col gap-2">
      <Text className="text-xs font-semibold text-[color:var(--jd-muted)]">Related pages</Text>
      <ul className="flex flex-row flex-wrap gap-2">
        {related.map((target) => {
          const page = relatedPagePath(path, target);
          return (
            <li key={target} className="flex w-full min-w-0 flex-row sm:w-auto">
              {page ? (
                <Link
                  href={docsPath(projectId, page)}
                  className="group flex min-h-11 w-full min-w-0 flex-row items-center gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] px-3 text-sm font-medium text-[color:var(--jd-ink)] transition-colors hover:border-[color:var(--jd-control-border)] hover:bg-[color:var(--jd-ink)]/[0.03]"
                >
                  <FileText size={16} aria-hidden="true" className="shrink-0 text-[color:var(--jd-muted)]" />
                  <Text className="min-w-0 truncate">{titles.get(page) ?? page}</Text>
                  <ArrowRight size={14} aria-hidden="true" className="ml-auto shrink-0 text-[color:var(--jd-muted)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <Text className="flex min-h-11 flex-row items-center px-1 font-mono text-xs text-[color:var(--jd-muted)]">{target}</Text>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
