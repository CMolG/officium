import { copyText, openUrlInNewTab, readText } from "@javadaba/sdk/platform";

/*
 * The actions the browser's own menu had, kept alive now that ours replaces it: what the target
 * is decides which exist (editable: cut, copy, paste, select all; selected text: copy; link: open,
 * copy address). Classification is separate from running so a test can pin each on a fixture.
 */

type TextField = HTMLInputElement | HTMLTextAreaElement;

export interface TargetInfo {
  /** The input, textarea or contenteditable region the target is in. */
  editable: HTMLElement | null;
  selectedText: string;
  /** The `href` of the nearest link, absolute. */
  linkHref: string | null;
}

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

const isTextField = (el: Element | null): el is TextField =>
  el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type));

export function describeTarget(target: Element): TargetInfo {
  const field = target.closest("input, textarea");
  const region = target.closest<HTMLElement>("[contenteditable]:not([contenteditable='false'])");
  const editable = isTextField(field) && !field.disabled ? field : region;

  let selectedText = "";
  if (isTextField(editable)) {
    selectedText = (editable.value ?? "").slice(editable.selectionStart ?? 0, editable.selectionEnd ?? 0);
  } else {
    selectedText = target.ownerDocument.getSelection()?.toString() ?? "";
  }

  const link = target.closest("a[href]");
  return { editable, selectedText, linkHref: link instanceof HTMLAnchorElement ? link.href : null };
}

export type EditAction = "cut" | "copy" | "paste" | "selectAll";

/** A read-only field cannot be cut from or pasted into. */
export const isReadOnly = (editable: HTMLElement): boolean =>
  isTextField(editable) ? editable.readOnly : false;

function insertText(editable: HTMLElement, text: string): void {
  editable.focus();
  if (isTextField(editable)) {
    editable.setRangeText(text, editable.selectionStart ?? 0, editable.selectionEnd ?? 0, "end");
    editable.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  // A rich-text editor listens for the browser's own input path; `insertText` goes through it.
  editable.ownerDocument.execCommand("insertText", false, text);
}

function deleteSelection(editable: HTMLElement): void {
  if (isTextField(editable)) insertText(editable, "");
  else editable.ownerDocument.execCommand("delete");
}

/** Runs one edit action; returns `false` only for a paste the browser refused to read. */
export async function runEditAction(action: EditAction, info: TargetInfo): Promise<boolean> {
  const { editable, selectedText } = info;
  if (action === "copy") return copyText(selectedText);
  if (!editable) return true;
  if (action === "cut") {
    const copied = await copyText(selectedText);
    if (copied) deleteSelection(editable);
    return copied;
  }
  if (action === "selectAll") {
    editable.focus();
    if (isTextField(editable)) editable.select();
    else editable.ownerDocument.execCommand("selectAll");
    return true;
  }
  const text = await readText();
  if (text === null) return false;
  insertText(editable, text);
  return true;
}

export const openLink = (href: string) => openUrlInNewTab(href);
export const copyLink = (href: string) => copyText(href);
