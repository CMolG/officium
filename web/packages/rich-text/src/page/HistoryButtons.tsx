"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { Redo2, Undo2 } from "lucide-react";

import { ToolbarButton } from "../toolbar";

/** Undo and Redo for the page's bar, greyed out when there is nothing to undo or redo. */
export function HistoryButtons({ editor }: { editor: Editor }) {
  const state = useEditorState({ editor, selector: ({ editor: e }) => ({ undo: e.can().undo(), redo: e.can().redo() }) });
  return (
    <>
      <ToolbarButton title="Undo (Ctrl+Z)" icon={Undo2} disabled={!state.undo} onClick={() => editor.chain().focus().undo().run()} />
      <ToolbarButton title="Redo (Ctrl+Shift+Z)" icon={Redo2} disabled={!state.redo} onClick={() => editor.chain().focus().redo().run()} />
    </>
  );
}
