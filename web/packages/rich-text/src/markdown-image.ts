import { type DOMOutputSpec } from "@tiptap/pm/model";
import ImageExt from "@tiptap/extension-image";

/**
 * A Markdown image (JAVA-798): `![caption](doc://<page>/_files/<name>)`. The caption IS the alt
 * text. The node never loads anything by itself: it draws an `<img>` only for a URL the HOST's
 * `resolveImage` returns, and the host answers for its own file references alone. A remote source,
 * a relative one, a `data:` one, and every image in a card (no host resolver) show a placeholder
 * with the caption instead, so a page cannot be made to call out to anywhere.
 */
export type ResolveImage = (src: string) => string | null;

export interface MarkdownImageOptions {
  resolveImage: ResolveImage | null;
}

const CLASS = "jd-page-image";

/** What stands where an image is not drawn: words, never a broken-image icon. */
export function imagePlaceholder(src: string, alt: string): { text: string; link: string | null } {
  const remote = /^https?:\/\//i.test(src);
  const name = decodeURIComponent(src.split("/").pop() ?? src);
  if (remote) return { text: "Remote image not shown", link: src };
  if (/^doc:\/\/.+\/_files\//.test(src)) return { text: `Image not found: ${name}`, link: null };
  return { text: alt ? `Image not shown: ${alt}` : "Image not shown", link: null };
}

function placeholderSpec(src: string, alt: string): DOMOutputSpec {
  const { text, link } = imagePlaceholder(src, alt);
  const note: DOMOutputSpec = link
    ? ["span", {}, text, " ", ["a", { href: link, rel: "noopener noreferrer nofollow", target: "_blank" }, link]]
    : ["span", {}, text];
  return ["figure", { class: `${CLASS} ${CLASS}-missing`, role: "img", "aria-label": alt || text }, note, ["figcaption", {}, alt]];
}

export const MarkdownImage = ImageExt.extend<MarkdownImageOptions>({
  addOptions() {
    return { ...this.parent?.(), allowBase64: false, inline: false, resolveImage: null };
  },

  renderHTML({ node }) {
    const src = String(node.attrs.src ?? "");
    const alt = String(node.attrs.alt ?? "");
    const url = this.options.resolveImage?.(src) ?? null;
    if (!url) return placeholderSpec(src, alt);
    return ["figure", { class: CLASS }, ["img", { src: url, alt }], ["figcaption", {}, alt]];
  },

  addNodeView() {
    const options = this.options;
    return ({ node, view, getPos }) => {
      const doc = view.dom.ownerDocument;
      let current = node;
      const figure = doc.createElement("figure");
      figure.className = CLASS;
      const media = doc.createElement("div");
      const caption = doc.createElement("input");
      caption.className = `${CLASS}-caption`;
      caption.placeholder = "Caption (also the alt text)";
      caption.setAttribute("aria-label", "Image caption");
      caption.readOnly = !view.editable;
      figure.append(media, caption);

      const showMissing = () => {
        const { text, link } = imagePlaceholder(String(current.attrs.src ?? ""), String(current.attrs.alt ?? ""));
        const note = doc.createElement("span");
        note.className = `${CLASS}-missing`;
        note.textContent = text;
        media.replaceChildren(note);
        if (link) {
          const a = doc.createElement("a");
          a.href = link;
          a.rel = "noopener noreferrer nofollow";
          a.target = "_blank";
          a.textContent = link;
          media.append(" ", a);
        }
      };
      const draw = () => {
        const url = options.resolveImage?.(String(current.attrs.src ?? "")) ?? null;
        caption.value = String(current.attrs.alt ?? "");
        if (!url) return showMissing();
        const img = doc.createElement("img");
        img.alt = String(current.attrs.alt ?? "");
        img.addEventListener("error", showMissing);
        img.src = url;
        media.replaceChildren(img);
      };
      caption.addEventListener("input", () => {
        const pos = getPos();
        if (pos === undefined) return;
        view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, alt: caption.value }));
      });
      draw();
      return {
        dom: figure,
        update: (next) => {
          if (next.type !== current.type) return false;
          const redraw = next.attrs.src !== current.attrs.src;
          current = next;
          if (redraw) draw();
          else if (caption.value !== next.attrs.alt) caption.value = String(next.attrs.alt ?? "");
          return true;
        },
        stopEvent: (event) => event.target === caption,
      };
    };
  },
});
