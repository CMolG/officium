"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { configurationPath } from "../../lib/configuration/places";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type DocPage, type DocTreeNode } from "../../lib/backlog/types";
import type { Crumb } from "../../lib/docs/doc-move";
import { useCurrentAccountId } from "../../lib/backlog/use-current-account";
import { announcementFor } from "../../lib/docs/doc-live";
import { useDocPresence } from "../../lib/docs/presence/use-doc-presence";
import { pageCommandDefs, usePageCommands } from "../../lib/docs/page-commands";
import { useDocPageLive } from "../../lib/docs/use-doc-page-live";
import { DocBacklinks } from "./DocBacklinks";
import { useDocRedirect } from "./use-doc-redirect";
import { DocHistoryPanel } from "./DocHistoryPanel";
import { DocLifecycleBanner } from "./DocLifecycleBanner";
import { DocPageActions } from "./DocPageActions";
import { DocPageEditing } from "./DocPageEditing";
import { useCommenting } from "./comments/use-commenting";
import { useDocFileContext } from "./use-doc-file-context";
import { DocPageStatus } from "./DocPageStatus";
import { DocPageObserving } from "./DocPageObserving";
import { DocTemplateBanner } from "./DocTemplateBanner";
import { UnsavedDraftsNotice } from "./UnsavedDraftsNotice";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");
const NOTE = "rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] px-3 py-2 text-sm";
const CONFLICT_MESSAGE = "Someone else changed this page since you opened it. It now shows their version: check it and try again.";

/**
 * One documentation page (JAVA-131): read formatted, renamed and deleted. Keyed by path in
 * `DocsView`, so each page starts clean. An editor edits it in place, saved as they type
 * (`DocPageEditing`, JAVA-796): there is no Edit mode and no Save button.
 *
 * Officium's own pages (`builtin`, JAVA-783), archived pages and a viewer's are read here with no
 * way to change them, and say why: the API refuses it.
 *
 * Agents edit these pages through MCP at any time, so a save can lose a race. It never overwrites
 * silently: the conflict shows both versions and the person keeps theirs, takes the other, or
 * merges -- the other version in the editor, their own beside it to copy from.
 */
export function DocPagePanel({
  projectId,
  path,
  repository,
  canWrite,
  owner,
  startEditing,
  takenPaths,
  onAutoEditUsed,
  onChanged,
  onMoved,
  onDeleted,
  node,
  titles,
  crumbs,
  onMove,
  onDuplicate,
  onNewFromTemplate,
  onMakeTemplate,
}: {
  projectId: string;
  path: string;
  repository: BacklogRepository;
  canWrite: boolean;
  /** The project's owner: deletes anyone's comment (JAVA-797). */
  owner: boolean;
  /** Put the caret in the text once loaded (a page just created). */
  startEditing: boolean;
  takenPaths: ReadonlySet<string>;
  onAutoEditUsed: () => void;
  /** After any write of this panel's: the tree re-reads, even with the live channel down. */
  onChanged: () => void;
  onMoved: (path: string) => void;
  /** After the page went to the trash: the view offers Undo and leaves the page. */
  onDeleted: (deleted: DocPage) => void;
  /** This page's node in the tree: its icon, its width and the pages under it. Null while the tree loads. */
  node: DocTreeNode | null;
  titles: ReadonlyMap<string, string>;
  /** The page's ancestors for the breadcrumb (JAVA-792). */
  crumbs: Crumb[];
  onMove?: () => void;
  onDuplicate?: () => void;
  /** "New page from this template", on a template's banner (JAVA-801). */
  onNewFromTemplate: (template: DocPage) => void;
  /** "Make a template" in Page options: a copy of this page becomes a template. */
  onMakeTemplate: (page: DocPage) => void;
}) {
  const [page, setPage] = useState<DocPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The title is the page's rename (JAVA-1537): the command menu's Rename puts the caret in it.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLost, setHistoryLost] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<"archive" | "delete" | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  // Whether this person is editing, for presence (JAVA-802): the editor says so (JAVA-796).
  const [editing, setEditing] = useState(false);
  const [holding, setHolding] = useState(false);
  const shown = useRef<DocPage | null>(null);
  const me = useCurrentAccountId();
  const meRef = useRef(me);
  const liveTick = useDocPageLive(repository, projectId, path, page?.version ?? null);
  const people = useDocPresence(repository, projectId, path, editing);
  // The command menu offers this page's actions, the ones its header buttons offer (JAVA-799). The text is
  // edited in place (JAVA-796), so there is no Edit command; a page deleted while open offers none.
  usePageCommands(
    page !== null && state !== "missing"
      ? pageCommandDefs({
          page,
          canWrite,
          busy: pending !== null,
          titleField: () => titleRef.current,
          onArchive: () => void lifecycleAction("archive"),
          onDelete: () => void lifecycleAction("delete"),
        })
      : [],
  );
  const commenting = useCommenting({ repository, projectId, path, page, canWrite, owner });
  const files = useDocFileContext(repository, projectId, path, page?.version ?? 0, page?.body ?? "");

  useEffect(() => {
    shown.current = page;
    meRef.current = me;
  }, [page, me]);

  // Held while there is text to save or a caret in it.
  const movedFrom = useDocRedirect(path, page, holding, onMoved);

  useEffect(() => {
    let cancelled = false;
    repository.getDoc(projectId, path).then(
      (next) => {
        if (cancelled) return;
        setAnnouncement((was) => announcementFor(shown.current, next, meRef.current) ?? was);
        setPage(next);
        setState("ready");
      },
      (err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "doc_not_found") {
          setState("missing");
        } else {
          setLoadError(messageOf(err));
          // A failed live re-read keeps the page on screen; only a first load has nothing to show.
          setState((s) => (s === "ready" ? s : "error"));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, path, repository, liveTick, attempt]);

  /** Archive, or Delete with no dialog: the page goes to the trash and the view offers Undo (reversible →
   *  undo). One at a time: a second click in flight would answer "No such page" beside an action that worked. */
  async function lifecycleAction(kind: "archive" | "delete") {
    if (!page || pending) return;
    setActionError(null);
    setPending(kind);
    try {
      const result = kind === "archive" ? await repository.archiveDoc(projectId, path) : await repository.deleteDoc(projectId, path, page.version);
      if (result && isConflict(result)) {
        setPage(result.current);
        setActionError(CONFLICT_MESSAGE);
        return;
      }
      onChanged();
      if (result) setPage(result);
      else onDeleted(page);
    } catch (err) {
      setActionError(messageOf(err));
    } finally {
      setPending(null);
    }
  }

  /** Publish and Unarchive, from the banner: it shows its own error. */
  async function transition(run: () => Promise<DocPage>): Promise<string | null> {
    try {
      setPage(await run());
      onChanged();
      return null;
    } catch (err) {
      return messageOf(err);
    }
  }

  // A page deleted while it was open stays on screen with what the editor holds, to copy from.
  const deleted = state === "missing" && page !== null;
  if (state === "loading" || (state === "error" && !page) || (state === "missing" && !page)) {
    return <DocPageStatus state={state} path={path} error={loadError} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  if (!page) return null;

  const reading = {
    projectId,
    page,
    node,
    titles,
    editable: canWrite && !page.builtin,
    canWrite,
    people,
    files,
    commenting: page.builtin ? undefined : commenting,
    actions: (
      <DocPageActions
        page={page}
        pending={pending}
        onArchive={() => void lifecycleAction("archive")}
        onDelete={() => void lifecycleAction("delete")}
      />
    ),
    notices: (
      <>
        <DocLifecycleBanner
          page={page}
          canWrite={canWrite && !page.builtin}
          onPublish={() => transition(() => repository.publishDoc(projectId, path))}
          onUnarchive={() => transition(() => repository.unarchiveDoc(projectId, path))}
        />
        <DocTemplateBanner page={page} canWrite={canWrite} onNewPage={() => onNewFromTemplate(page)} />
        {actionError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {actionError}
          </p>
        )}
      </>
    ),
    crumbs,
    movedFrom,
    // A template stays at its path (JAVA-801): it can be copied, never moved.
    onMove: canWrite && !page.builtin && !page.template ? onMove : undefined,
    onDuplicate: canWrite ? onDuplicate : undefined,
    after: page.builtin ? undefined : <DocBacklinks projectId={projectId} path={page.path} repository={repository} liveTick={liveTick} />,
    onMakeTemplate: canWrite && !page.builtin && !page.template && !deleted ? () => onMakeTemplate(page) : undefined,
    historyShown: showHistory,
    onToggleHistory: page.builtin ? undefined : () => setShowHistory((v) => !v),
    notice: (
      <>
        {deleted && <p role="status" className={NOTE}>Someone deleted this page while it was open. Copy what you need before leaving.</p>}
        {historyLost && (
          <p role="status" className={NOTE} data-testid="history-not-kept">
            Saved. The previous version wasn&apos;t kept: the owner&apos;s storage is full.{" "}
            <Link href={configurationPath("documentation", projectId)} className="font-medium underline underline-offset-2">
              See what takes the space
            </Link>
          </p>
        )}
      </>
    ),
    history: showHistory && !page.builtin && (
      <DocHistoryPanel
        projectId={projectId}
        path={page.path}
        repository={repository}
        canWrite={canWrite}
        page={page}
        onRestored={(next) => { setPage(next); onChanged(); }}
        onClose={() => setShowHistory(false)}
      />
    ),
  };

  // The page fills what the docs view leaves it, so its text and side panes can scroll on their own (JAVA-1535).
  return (
    <div className="flex min-w-0 flex-col gap-3 md:min-h-0 md:flex-1">
      <p role="status" className="sr-only" data-testid="doc-live-status">
        {announcement}
      </p>
      <UnsavedDraftsNotice projectId={projectId} current={path} />
      {canWrite && !page.builtin && !page.archivedAt && !deleted ? (
        <DocPageEditing
          reading={reading}
          repository={repository}
          titles={titles}
          takenPaths={takenPaths}
          startEditing={startEditing}
          onAutoEditUsed={onAutoEditUsed}
          onSaved={(saved) => {
            if (saved.title !== page.title) onChanged();
            setHistoryLost(saved.historyKept === false);
            setPage(saved);
          }}
          onChanged={onChanged}
          onEditingChange={setEditing}
          onHoldChange={setHolding}
          titleRef={titleRef}
        />
      ) : (
        <DocPageObserving reading={reading} repository={repository} />
      )}
    </div>
  );
}
