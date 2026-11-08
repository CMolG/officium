import type { ReactNode } from "react";
import { Archive, ChevronRight, FilePen, GitMerge, History, LayoutTemplate, Timer, Trash2 } from "lucide-react";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocPageSummary } from "../../lib/backlog/types";
import { ARCHIVE_PATH, CHANGELOG_PATH, RECENT_PATH, TEMPLATES_PATH, TEST_HISTORY_PATH, TRASH_PATH, UNPUBLISHED_PATH } from "../../lib/docs/doc-path";
import { DocNodeIcon } from "./DocNodeIcon";
import { DocSectionLink } from "./DocSectionLink";

/**
 * What the tree keeps on top and nobody arranges (JAVA-791): the changelog with how many changes still
 * wait for an answer, the test history, Recent, the templates (JAVA-801), the page lifecycle's three lists (JAVA-793) and Officium's own
 * pages. They are not nodes of the layout, so they have no drag handle and no menu. The Trash is for
 * editors: a viewer cannot restore anything, so there is nothing for them to see. Officium's own pages
 * sit inside their `officium/` section, which folds like a section of the tree (JAVA-1535).
 */
export function PinnedDocLinks({
  projectId,
  current,
  pinnedPages,
  pendingCount,
  canWrite,
  builtinCollapsed,
  onToggleBuiltin,
  onNavigate,
}: {
  projectId: string;
  current: string | null;
  pinnedPages: DocPageSummary[];
  pendingCount: number | null;
  canWrite: boolean;
  builtinCollapsed: boolean;
  onToggleBuiltin: () => void;
  onNavigate: () => void;
}) {
  const link = (to: string, props: { icon: ReactNode; label: string; testId?: string; badge?: string | null }) => (
    <DocSectionLink key={to} href={docsPath(projectId, to)} current={current === to} onNavigate={onNavigate} {...props} />
  );
  return (
    <div className="flex flex-col gap-0.5" data-testid="pinned-docs">
      {link(CHANGELOG_PATH, {
        icon: <GitMerge size={14} />,
        label: "Changelog",
        testId: "changelog-link",
        badge: pendingCount !== null && pendingCount > 0 ? `${pendingCount} pending` : null,
      })}
      {link(TEST_HISTORY_PATH, { icon: <Timer size={14} />, label: "Test history", testId: "test-history-link" })}
      {link(RECENT_PATH, { icon: <History size={14} />, label: "Recent", testId: "recent-link" })}
      {link(TEMPLATES_PATH, { icon: <LayoutTemplate size={14} />, label: "Templates", testId: "templates-link" })}
      {link(UNPUBLISHED_PATH, { icon: <FilePen size={14} />, label: "Unpublished drafts", testId: "unpublished-link" })}
      {link(ARCHIVE_PATH, { icon: <Archive size={14} />, label: "Archive", testId: "archive-link" })}
      {canWrite && link(TRASH_PATH, { icon: <Trash2 size={14} />, label: "Trash", testId: "trash-link" })}
      {pinnedPages.length > 0 && (
        <div className="flex flex-col gap-0.5" data-testid="builtin-docs-group">
          <button
            type="button"
            aria-expanded={!builtinCollapsed}
            onClick={onToggleBuiltin}
            className="flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-left hover:bg-[color:var(--jd-ink)]/[0.06]"
          >
            <ChevronRight size={14} aria-hidden="true" className={`shrink-0 text-[color:var(--jd-muted)] transition-transform ${builtinCollapsed ? "" : "rotate-90"}`} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-faint)]">Built in</span>
          </button>
          {!builtinCollapsed && (
            <div className="ml-3.5 flex flex-col gap-0.5 border-l border-[color:var(--jd-line)] pl-1.5">
              {pinnedPages.map((page) =>
                link(page.path, { icon: <DocNodeIcon icon={null} color={null} isSection={false} />, label: page.title }),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
