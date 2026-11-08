import type { ChainedCommands, Editor } from "@tiptap/core";
import { Selection, type Transaction } from "@tiptap/pm/state";
import type { Step } from "@tiptap/pm/transform";

/**
 * A format shown on the selection while its option is only being CONSIDERED -- hovered or reached
 * with the keyboard in a menu -- and taken back the moment it no longer is (JAVA-140).
 *
 * The preview runs the very command a click would, so what the author sees is exactly what the
 * click produces; a decoration could paint a font but never a heading level. What keeps it
 * transient is how the transaction is flagged:
 *
 * - `addToHistory: false`: no undo step. Undo still undoes the last REAL change.
 * - `preventUpdate`: tiptap emits no `update`, and `update` is what every consumer saves or syncs
 *   on (Fabula's chapter autosave, its title and layout frames, `MarkdownEditor`'s `onChange`).
 *
 * Taking it back applies the same steps inverted, with the same flags, and puts the selection
 * where it was. Committing is taking it back and then running the command normally: one undo step.
 * No `focus()` anywhere here -- the menu that is previewing keeps the focus (the font search).
 */

interface Held {
  inverted: Step[];
  selection: ReturnType<Selection["toJSON"]>;
}

const held = new WeakMap<Editor, Held>();

/** Shows `apply` on the selection, replacing whatever preview was showing. */
export function previewFormat(editor: Editor, apply: (chain: ChainedCommands) => ChainedCommands): void {
  restoreFormat(editor);
  if (editor.isDestroyed) return;
  const selection = editor.state.selection.toJSON();
  // Every transaction the command produced, including what plugins APPEND to it: a heading at the
  // end of the text makes StarterKit's trailing-node plugin add a paragraph after it, and taking
  // back only the command's own steps would leave that paragraph behind.
  const applied: Transaction[] = [];
  const record = ({ transaction, appendedTransactions }: { transaction: Transaction; appendedTransactions: Transaction[] }) => {
    applied.push(transaction, ...appendedTransactions);
  };
  editor.on("transaction", record);
  try {
    apply(editor.chain().setMeta("addToHistory", false).setMeta("preventUpdate", true)).run();
  } finally {
    editor.off("transaction", record);
  }
  const inverted = applied
    .flatMap((tr) => tr.steps.map((step, index) => step.invert(tr.docs[index])))
    .reverse();
  if (inverted.length > 0) held.set(editor, { inverted, selection });
}

/** Takes the preview back, if one is showing. Safe to call at any time. */
export function restoreFormat(editor: Editor): void {
  const preview = held.get(editor);
  if (!preview) return;
  held.delete(editor);
  if (editor.isDestroyed) return;
  const tr = editor.state.tr;
  // Nothing edits the text while a menu is open; if something replaced it anyway (an outside
  // `setContent`), the preview went with it and there is nothing left to take back.
  if (!preview.inverted.every((step) => !tr.maybeStep(step).failed)) return;
  tr.setSelection(Selection.fromJSON(tr.doc, preview.selection));
  editor.view.dispatch(tr.setMeta("addToHistory", false).setMeta("preventUpdate", true));
}
