/**
 * Pop out (Off-Board, "Picture in picture", JAVA-1115): a small window that stays above other apps, so the cards the AI
 * works stay in sight while someone codes. Chromium's Document Picture-in-Picture is the window when it is there; in
 * Firefox and Safari (or when it refuses) a small popup of its own holds the same list. Web half of a `.native` pair:
 * the Android app has no windows to pop out of.
 */

type DocumentPictureInPicture = { requestWindow(options?: { width?: number; height?: number }): Promise<Window> };

export const POP_OUT_SIZE = { width: 420, height: 360 } as const;

/** The attributes the theme and the fonts hang on (`class`, `data-*` on html and body), so the copy looks like the page. */
function copyAttributes(from: Element, to: Element) {
  for (const { name, value } of Array.from(from.attributes)) to.setAttribute(name, value);
}

/** Every stylesheet of this page into the other document: rules as text where readable, else a link to the file. */
function copyStyles(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
      target.head.append(style);
    } catch {
      if (!sheet.href) continue;
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      target.head.append(link);
    }
  }
}

export type PoppedOut = { win: Window; root: HTMLElement };

/** The window for the tray, null when neither kind can open (a blocked popup). */
export async function openPopOutWindow(title: string): Promise<PoppedOut | null> {
  const api = (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
  const pip = api ? await api.requestWindow(POP_OUT_SIZE).catch(() => null) : null;
  const win = pip ?? window.open("", "officium-ai-at-work", `popup,width=${POP_OUT_SIZE.width},height=${POP_OUT_SIZE.height}`);
  if (!win) return null;
  const doc = win.document;
  doc.title = title;
  copyAttributes(document.documentElement, doc.documentElement);
  copyAttributes(document.body, doc.body);
  copyStyles(doc);
  doc.documentElement.style.height = "100%";
  doc.body.style.cssText = "margin:0;height:100%";
  const root = doc.createElement("div");
  root.style.height = "100%";
  doc.body.replaceChildren(root);
  return { win, root };
}

/** Brings the board's own tab forward, for Open and Back to the board in the other window. */
export function focusMainWindow(): void {
  window.focus();
}

/** Runs `then` when the page goes away, so the pop-out does not outlive it. Returns the way to stop listening. */
export function onMainPageHide(then: () => void): () => void {
  window.addEventListener("pagehide", then);
  return () => window.removeEventListener("pagehide", then);
}
