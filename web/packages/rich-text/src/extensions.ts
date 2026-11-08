import { Node, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Color from "@tiptap/extension-color";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";

import { Alert, Details, DetailsSummary, Kbd } from "./doc-blocks";
import { BookImage } from "./image";
import { ImageDragPreview } from "./image-drag";
import { MarkdownImage, type ResolveImage } from "./markdown-image";
import { OWN_LINK } from "./page/links";

/**
 * The three schemas the ecosystem edits text with. Each is a function, not a shared array: an
 * editor keeps per-instance state on its extensions, so two editors never get the same objects.
 */

/**
 * Text is either raised or lowered, never both (JAVA-141): applying one takes the other off, so
 * the toolbar never shows both pressed. A document saved with both still opens: from JSON it keeps
 * both until either button is pressed on that text, from HTML the innermost tag wins
 * (`extensions.test.ts`).
 */
const ExclusiveSuperscript = Superscript.extend({ excludes: "subscript" });
const ExclusiveSubscript = Subscript.extend({ excludes: "superscript" });

/**
 * A book's body (Fabula's chapter pages and layout text frames): everything a printed page can
 * carry, including what Markdown cannot say -- underline, alignment, fonts, colour.
 * `extra` is how an app adds its own behaviour on top (Fabula's spellchecker).
 */
export function documentExtensions({ placeholder, extra = [] }: { placeholder: string; extra?: Extensions }): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      horizontalRule: false,
      // StarterKit v3 bundles both; they are added below with this editor's own options, and
      // registering them twice made TipTap warn about duplicate extensions on every mount.
      link: false,
      underline: false,
    }),
    HorizontalRule,
    Underline,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    FontFamily,
    Color,
    Highlight.configure({ multicolor: true }),
    Link.configure({ openOnClick: false }),
    BookImage,
    ImageDragPreview,
    Placeholder.configure({ placeholder }),
    CharacterCount,
    Typography,
    ExclusiveSuperscript,
    ExclusiveSubscript,
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    ...extra,
  ];
}

/**
 * A title's schema: exactly one paragraph. That is the whole "no block tools on the title" rule,
 * enforced by the document rather than by hoping every button checks where the caret is -- a
 * heading or a list simply cannot exist here.
 */
const TitleDocument = Node.create({ name: "doc", topNode: true, content: "paragraph" });

/**
 * A title can carry what a title actually needs -- a font, bold/italic/underline/strike, and
 * sub/superscript for a formula like H₂O (Fabula, user decision 2026-09-22) -- and nothing else.
 */
export function titleExtensions({ placeholder, extra = [] }: { placeholder: string; extra?: Extensions }): Extensions {
  return [
    StarterKit.configure({
      document: false,
      heading: false,
      blockquote: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      codeBlock: false,
      code: false,
      horizontalRule: false,
      hardBreak: false,
      link: false,
      dropcursor: false,
      gapcursor: false,
      trailingNode: false,
    }),
    TitleDocument,
    TextStyle,
    FontFamily,
    ExclusiveSuperscript,
    ExclusiveSubscript,
    Placeholder.configure({ placeholder }),
    ...extra,
  ];
}

/**
 * What Markdown can say, and nothing else: an app that STORES Markdown (Officium's descriptions,
 * action plans and comments, written by people and by agents alike) must not offer a control
 * whose result it cannot save. So no underline, no alignment, no font -- they would look applied
 * and vanish on the next load. GitHub-flavoured on purpose (task lists, tables, strikethrough,
 * alerts): it is the dialect agents write.
 */
export function markdownExtensions(
  { codeBlock = true, resolveImage = null, undoRedo = true }: { codeBlock?: boolean; resolveImage?: ResolveImage | null; undoRedo?: boolean } = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      underline: false,
      // A room's undo is Yjs's, which only reverts your own changes (JAVA-803).
      ...(undoRedo ? {} : { undoRedo: false as const }),
      // A page brings its own code block, with a language picker and a diagram preview (JAVA-796).
      ...(codeBlock ? {} : { codeBlock: false as const }),
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        // A card's text comes from other people and from agents: never let a link it carries act
        // on the page that shows it.
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        // A page's own links (JAVA-796): `doc://` to a page, `member://` to a person. Neither can
        // run anything, and without them `setLink` refuses the link and the editor draws it empty.
        isAllowedUri: (url, ctx) => ctx.defaultValidate(url) || OWN_LINK.test(url),
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    // Officium's page schema (JAVA-782): GitHub alerts, `<details>` and `<kbd>`.
    Alert,
    Details,
    DetailsSummary,
    Kbd,
    // `![caption](src)`: drawn only for a URL the host's `resolveImage` returns (JAVA-798), so a
    // card, a remote source or a relative one shows a placeholder and never loads anything.
    MarkdownImage.configure({ resolveImage }),
  ];
}

/** `markdownExtensions()` plus what only an editor needs. */
export function markdownEditorExtensions({ placeholder }: { placeholder?: string } = {}): Extensions {
  return [...markdownExtensions(), ...(placeholder ? [Placeholder.configure({ placeholder })] : [])];
}
