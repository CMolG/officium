"use client";

import { useEffect, useRef, useState, type ComponentProps, type RefObject } from "react";
import { PageEditor, type PageEditorHandle } from "@javadaba/rich-text";
import { openUrlInNewTab } from "@javadaba/sdk/platform";
import { Note } from "@javadaba/ui";
import { useRouter } from "@javadaba/ui/navigation";

import { ApiError } from "../../lib/backlog/api-error";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { docsPath } from "../../lib/backlog/search-links";
import type { DocPage } from "../../lib/backlog/types";
import { bodyPagePath } from "../../lib/docs/doc-links";
import { DocBody } from "./DocBody";
import { actorName, ConflictPanel } from "./DocConflictPanel";
import { AccessLostNotice } from "./AccessLostNotice";
import { MergeNotice } from "./MergeNotice";
import { DocReadingView } from "./DocReadingView";
import { AttachButton } from "./AttachButton";
import { useDocFilePicker } from "./doc-file-picker";
import { DocFilesPanel } from "./DocFilesPanel";
import { DocSaveStatus } from "./DocSaveStatus";
import { DocTitleField } from "./DocTitleField";
import { DocRoomStatus } from "./DocRoomStatus";
import { DocUnsavedAside } from "./DocUnsavedAside";
import { useCommentActions } from "./use-comment-actions";
import { DocFollowBar } from "./DocFollowBar";
import { buildLinkSources } from "./doc-link-sources";
import { useDocAutosave } from "./use-doc-autosave";
import { usePageRoom, useRoomSeed } from "./use-page-room";
import { useEditingFocus } from "./use-editing-focus";

type ReadingProps = Omit<ComponentProps<typeof DocReadingView>, "titleSlot" | "bodySlot">;


type DocPageEditingProps = {
  reading: ReadingProps;
  repository: BacklogRepository;
  titles: ReadonlyMap<string, string>;
  takenPaths: ReadonlySet<string>;
  startEditing: boolean;
  onAutoEditUsed: () => void;
  onSaved: (page: DocPage) => void;
  onChanged: () => void;
  /** Whether the person is editing, for presence (JAVA-802). */
  onEditingChange: (editing: boolean) => void;
  /** Whether the address must stay while the page moves (JAVA-792): unsaved changes, or the caret in the title or text. */
  onHoldChange: (holding: boolean) => void;
  /** The title's heading, which the command menu's Rename focuses (JAVA-1537). */
  titleRef: RefObject<HTMLHeadingElement | null>;
};

/**
 * A page an editor opened (JAVA-796): the same page they read, with its title and text editable in
 * place and saved as they type. A save another writer won opens the merge panel; lost editor access
 * turns the page read-only and keeps the unsaved text beside it to copy.
 */
export function DocPageEditing({
  reading, repository, titles, takenPaths, startEditing, onAutoEditUsed, onSaved, onChanged, onEditingChange, onHoldChange, titleRef,
}: DocPageEditingProps) {
  const { projectId, page, commenting } = reading;
  const router = useRouter();
  const editor = useRef<PageEditorHandle>(null);
  const { room, members, collaborative, joining } = usePageRoom({ repository, projectId, page });
  const doc = useDocAutosave({
    projectId, page, repository, editor, room,
    onSaved: (saved) => {
      onSaved(saved);
      room.snapshot();
    },
  });
  /** The focused Dismiss button unmounts with the notice: keyboard focus goes back to the page text, not the body. */
  const dismissNotice = () => {
    doc.dismissNotice();
    editor.current?.focus();
  };
  const attached = useDocFilePicker({ projectId, path: page.path, repository, editor });
  const [editorReady, setEditorReady] = useState(false);
  useRoomSeed({ room, editorReady, editor, draft: doc.draft });
  const [autoFocus] = useState(startEditing);
  const comments = useCommentActions(commenting, () => doc.autosave.flush());
  const focus = useEditingFocus();
  const editing = focus.within || doc.autosave.unsaved;
  const holding = focus.typing || doc.autosave.unsaved;

  useEffect(() => onEditingChange(editing), [editing, onEditingChange]);
  useEffect(() => onHoldChange(holding), [holding, onHoldChange]);
  useEffect(() => () => onHoldChange(false), [onHoldChange]);

  useEffect(() => {
    if (autoFocus) onAutoEditUsed();
  }, [autoFocus, onAutoEditUsed]);

  if (doc.conflict) {
    return (
      <div className="pb-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <ConflictPanel conflict={doc.conflict} saving={false} error={null} onMerge={doc.merge} onKeepMine={doc.keepMine} onUseTheirs={doc.useTheirs} />
      </div>
    );
  }

  const { status, error } = doc.autosave;
  const accessLost = status === "failed" && error instanceof ApiError && error.status === 403;
  const pageOf = (href: string) => bodyPagePath(page.path, href);
  const linkSources = buildLinkSources({ repository, projectId, page, titles, takenPaths, members, onChanged });

  const readView = <DocBody projectId={projectId} path={page.path} body={page.body} files={reading.files} />;
  return (
    <div className="contents" onFocusCapture={focus.onFocus} onBlurCapture={focus.onBlur}>
    <DocReadingView
      {...reading}
      titleSlot={accessLost ? undefined : <DocTitleField value={doc.draft.title} onChange={doc.setTitle} headingRef={titleRef} />}
      bodySlot={
        <>
          <DocFilesPanel projectId={projectId} inputRef={attached.input} notices={attached.notices} onFiles={(picked) => void attached.upload(picked)} onDismiss={attached.dismiss} />
          <DocFollowBar />
          {doc.restored && <Note tone="info" role="status">Your unsaved changes to this page were restored.</Note>}
          {doc.overtaken && (
            <Note tone="warning" role="status">
              {actorName(doc.overtaken.updatedBy)} saved a newer version while you were editing. When yours saves, you&apos;ll see both and choose.
            </Note>
          )}
          {doc.notice && <MergeNotice notice={doc.notice} onOpenHistory={reading.historyShown ? undefined : reading.onToggleHistory} onDismiss={dismissNotice} />}
          {accessLost ? (
            <>
              <AccessLostNotice body={doc.draft.body} />
              {readView}
              <DocUnsavedAside body={doc.draft.body} />
            </>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row">
              {joining || !room.settled ? (
                <Note tone="neutral" role="status" className="min-w-0 flex-1">Connecting to the live room…</Note>
              ) : (
              <PageEditor
                key={doc.editorKey}
                ref={editor}
                value={doc.initialBody}
                onChange={doc.setBody}
                label="Page text"
                status={
                  <>
                    <DocRoomStatus active={room.active} unavailable={collaborative && room.unavailable} />
                    <AttachButton onClick={attached.attach} />
                    <DocSaveStatus projectId={projectId} status={status} error={error} onRetry={() => void doc.autosave.retry()} />
                  </>
                }
                blockItems={attached.blockItems}
                resolveImage={reading.files?.resolve}
                onFiles={(dropped) => void attached.upload(dropped)}
                readView={readView}
                linkSources={linkSources}
                describeLink={(href) => (href.startsWith("member://") ? "A project member" : titles.get(pageOf(href) ?? "") ?? href)}
                onOpenLink={(href) => {
                  const target = pageOf(href);
                  if (target) router.push(docsPath(projectId, target));
                  else if (/^https?:\/\//i.test(href)) openUrlInNewTab(href);
                }}
                onSaveNow={doc.saveNow}
                extensions={comments.extensions}
                selectionActions={comments.actions}
                autoFocus={autoFocus}
                collaboration={room.collaboration}
                onEditorReady={() => setEditorReady(true)}
                className="min-w-0 flex-1"
              />
              )}
              {doc.reference && <DocUnsavedAside body={doc.reference.body} title={doc.reference.title} className="min-w-0 flex-1" />}
            </div>
          )}
        </>
      }
    />
    </div>
  );
}
