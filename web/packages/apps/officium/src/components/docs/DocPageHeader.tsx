import { useEffect, type ReactNode } from "react";
import { Bot, UserRound } from "lucide-react";

import type { Actor, DocPage, DocPresencePerson, DocTreeNode } from "../../lib/backlog/types";
import type { Crumb } from "../../lib/docs/doc-move";
import { relativeUpdated } from "../../lib/docs/relative-time";
import { useDocStars } from "../../lib/docs/use-doc-stars";
import { useNow } from "../../lib/docs/use-now";
import { DocBreadcrumbs } from "./DocBreadcrumbs";
import { BuiltinBadge } from "./BuiltinBadge";
import { DocNodeIcon } from "./DocNodeIcon";
import { DocPresenceAvatars } from "./DocPresenceAvatars";
import { DocStarButton } from "./DocStarButton";
import { DraftBadge } from "./DraftBadge";

const actorName = (actor: Actor) => (actor.kind === "agent" ? (actor.agentName ?? actor.name) : actor.name);

/**
 * The header of a page read (JAVA-795): the path on its own row, the tools on the next, then icon and title, then who
 * changed it last (an agent is told apart by the word "agent", never by colour). The page's own actions (Archive,
 * Delete) come first; the reading tools after them.
 *
 * Each of the path, the tools and the title has a row of its own (JAVA-1537's review): sharing one, a long path was
 * squeezed by the controls and a long title by both. The tools stay at the right edge, where they always were.
 */
export function DocPageHeader({
  projectId,
  page,
  node,
  crumbs,
  movedFrom,
  title,
  stats,
  actions,
  tools,
  people,
}: {
  projectId: string;
  page: DocPage;
  node: DocTreeNode | null;
  crumbs: Crumb[];
  /** The old path the page was reached through, if it was. */
  movedFrom: string | null;
  /** The title as a field, while an editor edits in place (JAVA-796). */
  title?: ReactNode;
  /** The other people on this page (JAVA-802). */
  people: DocPresencePerson[];
  /** "1,234 words · about 7 min read", or null while the count is off. */
  stats: string | null;
  /** The page's own actions (`DocPageActions`), or null when the reader can't change it. */
  actions: ReactNode;
  tools: ReactNode;
}) {
  const agent = page.updatedBy.kind === "agent";
  const draft = page.publishedAt === null && !page.template;
  const now = useNow(30_000);
  const { recordView } = useDocStars();
  // Opening a page puts it in Recent (JAVA-799); Officium's own pages have no row to record.
  useEffect(() => {
    if (!page.builtin) recordView(page.path);
  }, [page.builtin, page.path, recordView]);
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-[color:var(--jd-line)] pb-4">
      <div className="flex min-w-0 flex-row flex-wrap items-center gap-2">
        <DocBreadcrumbs
          projectId={projectId}
          crumbs={crumbs}
          title={page.title}
          current={{ icon: node?.icon ?? null, iconColor: node?.iconColor ?? null }}
        />
        {page.builtin && <BuiltinBadge />}
      </div>
      <div className="flex flex-row flex-wrap items-center justify-end gap-2" data-testid="doc-controls">
        <DocPresenceAvatars people={people} />
        {actions}
        {tools}
        {!page.builtin && !page.template && <DocStarButton path={page.path} />}
      </div>
      {movedFrom && (
        <p role="status" className="text-xs text-[color:var(--jd-muted)]" data-testid="doc-moved-from">
          Moved from <code className="break-all font-mono">{movedFrom}</code>. This page is now at{" "}
          <code className="break-all font-mono">{page.path}</code>.
        </p>
      )}
      {/* The title takes the row's whole width and wraps only at its edge: `text-balance` used to break a long one early
          to even its lines, so it read as cut short of the room it had. */}
      {title ? (
        <div className="flex w-full min-w-0 flex-row items-start gap-2 text-xl sm:text-2xl">
          <span className="flex h-[1.4em] shrink-0 flex-row items-center">
            <DocNodeIcon icon={node?.icon ?? null} color={node?.iconColor ?? null} isSection={false} size={22} />
          </span>
          {/* The field sizes to its text, so a short title keeps its badge beside it and a long one wraps it below. */}
          <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
            {title}
            {draft && <DraftBadge />}
          </div>
        </div>
      ) : (
        <h2 className="flex w-full min-w-0 flex-row items-start gap-2 text-xl font-bold sm:text-2xl">
          <span className="flex h-[1.4em] shrink-0 flex-row items-center">
            <DocNodeIcon icon={node?.icon ?? null} color={node?.iconColor ?? null} isSection={false} size={22} />
          </span>
          {/* The badge follows the title's last word, so it never takes a column of width from the title. */}
          <span className="min-w-0 flex-1 break-words leading-[1.4]">
            {page.title}
            {draft && (
              <span className="ml-2 inline-flex flex-row translate-y-[-0.15em] align-middle">
                <DraftBadge />
              </span>
            )}
          </span>
        </h2>
      )}
      <p className="flex flex-row flex-wrap items-center gap-x-1 text-xs text-[color:var(--jd-muted)]">
        {agent ? <Bot size={12} aria-hidden="true" /> : <UserRound size={12} aria-hidden="true" />}
        <span>
          Updated <time dateTime={page.updatedAt}>{relativeUpdated(page.updatedAt, now)}</time> by {actorName(page.updatedBy)}
          {agent ? " (agent)" : ""}
        </span>
        {stats && <span data-testid="doc-stats">· {stats}</span>}
      </p>
    </header>
  );
}
