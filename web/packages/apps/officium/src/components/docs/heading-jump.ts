import { prefersReducedMotion } from "@javadaba/sdk/platform";

/**
 * The contents' jump (JAVA-795): the heading scrolls into view and takes the focus, so the next Tab
 * goes on from there. In a page edited in place (JAVA-796) the heading is text being edited, so the
 * editor takes the focus and the caret goes to the heading's start.
 */
export function jumpToHeading(body: HTMLElement | null, id: string): void {
  const heading = body?.querySelector<HTMLElement>(`#${id}`);
  if (!heading) return;
  heading.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  const editing = heading.isContentEditable ? heading.closest<HTMLElement>("[contenteditable='true']") : null;
  if (editing) {
    editing.focus({ preventScroll: true });
    heading.ownerDocument.getSelection()?.collapse(heading, 0);
    return;
  }
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}
