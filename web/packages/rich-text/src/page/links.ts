import type { Editor, Range } from "@tiptap/core";

/**
 * Links by title (JAVA-796): `[[` and `@` insert a link the person found by name, never a typed
 * address. A page is a `doc://<path>` link titled as the page; a member is `[@Name](member://<id>)`,
 * which any Markdown reader shows as "@Name" and an agent resolves with `members.list`.
 */
export interface LinkTarget {
  href: string;
  title: string;
  /** A quieter line under the title: the page's path. */
  detail?: string;
}

export interface LinkSources {
  /** The pages whose title matches, filtered in memory: no request per keystroke. */
  pages: (query: string) => readonly LinkTarget[];
  /** The members whose name matches; `null` while they load. `@` lists them before pages. */
  members?: (query: string) => readonly LinkTarget[] | null;
  /** Creates an empty page with this title and answers its link; rejects with what to tell the person. */
  createPage?: (title: string) => Promise<LinkTarget>;
}

export const MEMBER_SCHEME = "member://";

export const isMemberLink = (href: string) => href.startsWith(MEMBER_SCHEME);

/** The schemes the editor accepts on a link besides the web's: a page and a member. */
export const OWN_LINK = /^(?:doc|member):\/\/\S+$/;

/** Replaces the trigger and query with the link, and a space after it so typing goes on outside. */
export function insertLink(editor: Editor, range: Range, target: LinkTarget): void {
  const text = isMemberLink(target.href) ? `@${target.title}` : target.title;
  editor
    .chain()
    .focus()
    .insertContentAt(range, [
      { type: "text", text, marks: [{ type: "link", attrs: { href: target.href } }] },
      { type: "text", text: " " },
    ])
    .run();
}

/** Whether a title already names one of the targets, ignoring case and surrounding spaces. */
export function hasExactTitle(targets: readonly LinkTarget[], title: string): boolean {
  const wanted = title.trim().toLowerCase();
  return targets.some((target) => target.title.trim().toLowerCase() === wanted);
}
