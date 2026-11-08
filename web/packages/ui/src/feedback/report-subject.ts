/*
 * A local, visual copy of the element a report is about (JAVA-1181). Shown in the dialog, never
 * sent: the payload stays the contract's. Layout reads go through the element's own window. `null` means "cannot be drawn", and the dialog says the name in words.
 */

export interface ReportSubject {
  node: HTMLElement;
  width: number;
  height: number;
  backdrop: string;
}

export interface ReportPreview {
  name: string;
  source?: string;
  subject: ReportSubject | null;
}

const STRIPPED = ["id", "name", "for", "form", "data-testid", "tabindex", "autofocus", "autoplay"];
const OPAQUE_KINDS = "video, iframe, audio, object, embed";
const INHERITED = [
  "font-family", "font-size", "font-weight", "font-style", "font-variant", "font-stretch", "line-height",
  "letter-spacing", "word-spacing", "text-align", "text-indent", "text-transform", "text-shadow", "white-space",
  "word-break", "overflow-wrap", "direction", "writing-mode", "visibility", "color", "color-scheme", "cursor",
];

/** Scale to fit the box without ever growing the subject or changing its aspect ratio. */
export function fitScale(box: { width: number; height: number }, subject: { width: number; height: number }): number {
  if (subject.width <= 0 || subject.height <= 0) return 1;
  return Math.min(1, box.width / subject.width, box.height / subject.height);
}

function sanitize(root: HTMLElement) {
  for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    for (const name of STRIPPED) el.removeAttribute(name);
    for (const attr of Array.from(el.attributes)) if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = "";
      el.removeAttribute("value");
      if (el instanceof HTMLInputElement) {
        el.checked = false;
        el.removeAttribute("checked");
      } else {
        el.replaceChildren();
      }
    }
    if (el.isContentEditable || el.getAttribute("contenteditable") === "true") el.replaceChildren();
  }
}

function neutralBoxes(source: HTMLElement, clone: HTMLElement) {
  const originals = Array.from(source.querySelectorAll<HTMLElement>(OPAQUE_KINDS));
  Array.from(clone.querySelectorAll<HTMLElement>(OPAQUE_KINDS)).forEach((el, i) => {
    const box = el.ownerDocument.createElement("div");
    box.style.width = `${originals[i]?.offsetWidth ?? 0}px`;
    box.style.height = `${originals[i]?.offsetHeight ?? 0}px`;
    box.style.background = "rgba(127,127,127,0.2)";
    el.replaceWith(box);
  });
}

function copyCanvases(source: HTMLElement, clone: HTMLElement) {
  const originals = [source, ...Array.from(source.querySelectorAll("canvas"))].filter((el) => el instanceof HTMLCanvasElement);
  const copies = [clone, ...Array.from(clone.querySelectorAll("canvas"))].filter((el) => el instanceof HTMLCanvasElement);
  copies.forEach((copy, i) => {
    const from = originals[i] as HTMLCanvasElement | undefined;
    if (from && from.width > 0 && from.height > 0) copy.getContext("2d")?.drawImage(from, 0, 0);
  });
}

function backdropOf(el: Element, view: Window): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const color = view.getComputedStyle(node).backgroundColor;
    if (color && !/^rgba?\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$|^transparent$/.test(color)) return color;
  }
  return "transparent";
}

/** The parent's inherited look and every custom property, plus a `display: contents` shell per ancestor. */
function wrapInContext(source: HTMLElement, clone: HTMLElement, view: Window): HTMLElement {
  const doc = source.ownerDocument;
  const parent = source.parentElement;
  let content: HTMLElement = clone;
  if (!parent) return content;
  const style = view.getComputedStyle(parent);

  const holder = doc.createElement("div");
  for (const prop of INHERITED) holder.style.setProperty(prop, style.getPropertyValue(prop));
  for (let i = 0; i < style.length; i += 1) {
    const prop = style.item(i);
    if (prop.startsWith("--")) holder.style.setProperty(prop, style.getPropertyValue(prop));
  }
  holder.appendChild(clone);
  content = holder;

  for (let node = parent; node && node !== doc.body && node !== doc.documentElement; node = node.parentElement as HTMLElement) {
    const shell = doc.createElement("div");
    for (const attr of Array.from(node.attributes)) {
      if (STRIPPED.includes(attr.name) || attr.name.startsWith("on") || attr.name === "style") continue;
      shell.setAttribute(attr.name, attr.value);
    }
    shell.style.setProperty("display", "contents", "important");
    shell.appendChild(content);
    content = shell;
    if (!node.parentElement) break;
  }
  return content;
}

export function captureSubject(el: Element): ReportSubject | null {
  try {
    const view = el.ownerDocument.defaultView;
    if (!view || !(el instanceof view.HTMLElement) || el.matches(OPAQUE_KINDS)) return null;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (width <= 0 || height <= 0) return null;

    const clone = el.cloneNode(true) as HTMLElement;
    copyCanvases(el, clone);
    neutralBoxes(el, clone);
    sanitize(clone);
    clone.style.cssText += `;position:relative;inset:auto;margin:0;transform:none;width:${width}px;height:${height}px;`;
    return { node: wrapInContext(el, clone, view), width, height, backdrop: backdropOf(el, view) };
  } catch {
    // Any cloning failure falls back to the name in words: the header always says what is reported.
    return null;
  }
}
