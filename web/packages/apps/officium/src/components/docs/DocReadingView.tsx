import type { ReactNode } from "react";

import type { DocPage, DocPresencePerson, DocTreeNode } from "../../lib/backlog/types";
import type { DocFileContext } from "../../lib/docs/doc-files";
import type { Crumb } from "../../lib/docs/doc-move";
import { DocBody } from "./DocBody";
import { DocChildPages } from "./DocChildPages";
import { DocMetadata } from "./DocMetadata";
import { DocPageHeader } from "./DocPageHeader";
import { DocPageTools } from "./DocPageTools";
import { DocCommentPopover } from "./comments/DocCommentPopover";
import { DocCommentsSection } from "./comments/DocCommentsSection";
import { DocReadingAside } from "./DocReadingAside";
import { usePassages } from "./comments/use-passages";
import type { Commenting } from "./comments/use-commenting";
import { useDocReading } from "./use-doc-reading";

const WORDS_PER_MINUTE = 200;

function statsLine(words: number): string {
  const count = `${words.toLocaleString("en-US")} ${words === 1 ? "word" : "words"}`;
  return words === 0 ? count : `${count} · about ${Math.ceil(words / WORDS_PER_MINUTE)} min read`;
}

type DocReadingViewProps = {
  projectId: string;
  page: DocPage;
  node: DocTreeNode | null;
  /** The titles of this project's pages by path, so a related page reads by its name. */
  titles: ReadonlyMap<string, string>;
  editable: boolean;
  canWrite: boolean;
  /** Archive and Delete, shown to an editor of a page that is not Officium's own. */
  actions: ReactNode;
  /** What the page's life says above it (unpublished draft, archived) and a failed action. */
  notices: ReactNode;
  /** The page's ancestors, for the breadcrumb (JAVA-792). */
  crumbs: Crumb[];
  /** The old path this page was reached through, shown as "Moved from …". */
  movedFrom?: string | null;
  /** Absent where the person can't move or copy the page. */
  onMove?: () => void;
  onDuplicate?: () => void;
  /** Sits right after the pages under this one: "Referenced by". */
  after?: ReactNode;
  historyShown?: boolean;
  /** Absent where a page keeps no history (Officium's own pages). */
  onToggleHistory?: () => void;
  notice?: ReactNode;
  /** The other people on this page (JAVA-802). */
  people: DocPresencePerson[];
  /** The history panel while History is on, shown in the side column (JAVA-1537). */
  history?: ReactNode;
  /** The title as a field, in the header's title place. */
  titleSlot?: ReactNode;
  /** The text as an editor, in the text's place. */
  bodySlot?: ReactNode;
  /** Where the page's files are read from (JAVA-798). */
  files?: DocFileContext;
  /** "Make a template" in Page options (JAVA-801); absent where the page can't become one. */
  onMakeTemplate?: () => void;
  /** The page's comments (JAVA-797); absent where a page takes none (Officium's own). */
  commenting?: Commenting;
};

/**
 * A documentation page read (JAVA-795): header with its tools, the properties panel, the text with its side column,
 * the pages under this one and its comments (JAVA-1538). The page's own actions and lifecycle notices (JAVA-793) are the caller's, and so is
 * its history (JAVA-794): the History button toggles it and `history` (the panel) takes the side column, where the
 * contents and the comments live too (JAVA-1537). An editor edits in place (JAVA-796): `titleSlot` and `bodySlot`
 * take the title's and the text's places, and everything around them stays. Every page reads at full width.
 */
export function DocReadingView({
  projectId,
  page,
  node,
  titles,
  editable,
  canWrite,
  actions,
  notices,
  crumbs,
  movedFrom = null,
  onMove,
  onDuplicate,
  after,
  historyShown = false,
  onToggleHistory,
  notice,
  people,
  history,
  titleSlot,
  bodySlot,
  files,
  onMakeTemplate,
  commenting,
}: DocReadingViewProps) {
  // The ref stays apart from what renders, so passing the rest along reads no ref while rendering.
  const { bodyRef, ...reading } = useDocReading(page.body);
  const passages = usePassages(bodyRef, commenting, page, Boolean(bodySlot));

  // The header stays at the top of the pane; below it the text and the side column scroll each on their own
  // (JAVA-1535). On a phone the page keeps the window's single scroll.
  return (
    <article className="flex flex-col gap-5 md:min-h-0 md:flex-1" data-testid="doc-page">
      <DocPageHeader
        projectId={projectId}
        page={page}
        node={node}
        crumbs={crumbs}
        movedFrom={movedFrom}
        title={titleSlot}
        people={people}
        stats={reading.showWordCount ? statsLine(reading.words) : null}
        actions={editable ? actions : null}
        tools={
          <DocPageTools
            page={page}
            reading={reading}
            historyShown={historyShown}
            onToggleHistory={onToggleHistory}
            onMove={onMove}
            onDuplicate={onDuplicate}
            onMakeTemplate={onMakeTemplate}
          />
        }
      />
      <div className="flex flex-row gap-8 md:min-h-0 md:flex-1">
        <div ref={bodyRef} data-testid="doc-scroll" className="flex min-w-0 flex-1 flex-col gap-5 pb-6 md:overflow-y-auto md:overscroll-contain md:pr-2">
          {notices}
          {notice}
          <DocMetadata projectId={projectId} path={page.path} title={page.title} body={page.body} titles={titles} />
          {bodySlot ?? <DocBody projectId={projectId} path={page.path} body={page.body} files={files} />}
          <DocChildPages projectId={projectId} node={node} />
          {after}
          {commenting && <DocCommentsSection projectId={projectId} commenting={commenting} anchored={passages.anchored} />}
          {page.builtin ? (
            <p className="text-xs text-[color:var(--jd-muted)]">
              This is one of Officium&apos;s own pages, the same in every project. Officium keeps it up to date, so it
              can&apos;t be edited, moved or deleted here.
            </p>
          ) : (
            !canWrite && (
              <p className="text-xs text-[color:var(--jd-muted)]">
                You can read this project&apos;s documentation. Editing it needs editor access.
              </p>
            )
          )}
        </div>
        <DocReadingAside
          headings={reading.headings}
          contentsShown={reading.panelShown}
          history={history || null}
          onCloseHistory={() => onToggleHistory?.()}
          onJump={reading.jump}
        />
      </div>
      {commenting && <DocCommentPopover projectId={projectId} commenting={commenting} passages={passages} body={bodyRef} />}
    </article>
  );
}
