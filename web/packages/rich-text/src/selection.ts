import type { ChainedCommands, Editor } from "@tiptap/core";

/**
 * Does this selection cover the document from end to end -- the state `Cmd+A` leaves behind?
 *
 * Read off the positions instead of `selection instanceof AllSelection`, so a consumer does not
 * have to import `@tiptap/pm` just to name a class. The positions are unambiguous: an
 * `AllSelection` anchors at 0 and heads at `doc.content.size`, and it is the only selection that
 * reaches 0 -- a `TextSelection` over the very same text starts at 1, inside the first block.
 */
export function spansWholeDocument(selection: { from: number; to: number }, docContentSize: number): boolean {
  return selection.from === 0 && selection.to === docContentSize;
}

/**
 * Applies a command that rewrites block structure, and drops the caret at the end afterwards if
 * the command was applied to the whole document.
 *
 * [[JDB-186]] (Fabula): `Cmd+A` followed by a block format left ProseMirror holding the
 * document-wide selection while the browser painted a plain collapsed caret. The author saw a
 * caret, typed one character, and that character replaced the entire chapter -- correct behaviour
 * for a selection nobody ever cleared, and a data-loss bug for anyone using the editor.
 *
 * Collapsing takes away nothing the author could act on: the selection was already invisible.
 * Inline marks deliberately do NOT go through here -- they leave the block structure alone, their
 * selection stays painted, and chaining bold onto italic keeps working.
 */
export function runBlockCommand(editor: Editor, apply: (chain: ChainedCommands) => ChainedCommands): void {
  const wholeDocument = spansWholeDocument(editor.state.selection, editor.state.doc.content.size);
  apply(editor.chain().focus()).run();
  if (wholeDocument) editor.commands.focus("end");
}
