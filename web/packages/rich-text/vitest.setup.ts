// jsdom draws nothing, and ProseMirror measures the caret when a selection scrolls into view: tiptap's
// `focus()` does it on the next animation frame, so a test that focuses the editor threw
// `getClientRects is not a function` whenever that frame came before cleanup, as it does under load
// (JAVA-804). Every editor test gets an empty layout instead.
const none = Object.assign([] as unknown as DOMRectList, { item: () => null });
Range.prototype.getClientRects = () => none;
Range.prototype.getBoundingClientRect = () => new DOMRect();
Element.prototype.getClientRects = () => none;
