"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";

import type { PageCollaboration } from "./collaboration";
import { HistoryButtons } from "./HistoryButtons";
import { PageCollaborators } from "./PageCollaborators";
import { PageModeSwitch, type PageMode } from "./PageModeSwitch";

export interface PageBarProps {
  mode: PageMode;
  onMode: (mode: PageMode) => void;
  /** The visual editor, once it exists: Undo and Redo act on it. */
  editor: Editor | null;
  /** Followed, not edited: no history, no modes. */
  readOnly?: boolean;
  /** Read is offered when the host can draw the page. */
  canRead: boolean;
  /** Why Visual rests (a page the visual editor can't keep exactly). */
  visualUnavailable?: string;
  collaboration?: PageCollaboration;
  /** The host's save status, said in words. */
  status?: ReactNode;
}

/**
 * The slim bar over a page (Lib-RichText 12): Undo and Redo, the modes, then who is editing and what is
 * saved on the right. It has no Save button: the page saves itself and says so.
 */
export function PageBar({ mode, onMode, editor, readOnly, canRead, visualUnavailable, collaboration, status }: PageBarProps) {
  return (
    <div role="toolbar" aria-label="Page" className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 border-b border-[color:var(--jd-line)] py-1">
      {mode === "visual" && editor && !readOnly && <HistoryButtons editor={editor} />}
      {!readOnly && <PageModeSwitch mode={mode} onChange={onMode} canRead={canRead} visualUnavailable={visualUnavailable} />}
      <div className="ml-auto flex min-w-0 flex-row items-center gap-3">
        {collaboration && <PageCollaborators collaboration={collaboration} />}
        {status}
      </div>
    </div>
  );
}
