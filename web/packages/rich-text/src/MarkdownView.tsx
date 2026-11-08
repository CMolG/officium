"use client";

import type { HTMLAttributes, ReactNode } from "react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { renderToReactElement } from "@tiptap/static-renderer";

import { ALERT_KINDS, ALERT_LABELS, type AlertKind } from "./doc-blocks";
import { LinkView, RenderLinkContext, type RenderLink } from "./LinkView";
import { markdownHeadings } from "./headings";
import { markdownSchema, parseMarkdown } from "./markdown";
import { markdownExtensions } from "./extensions";
import type { ResolveImage } from "./markdown-image";
import { MermaidDiagram } from "./MermaidDiagram";
import { TableView } from "./TableView";

export interface MarkdownViewProps extends HTMLAttributes<HTMLDivElement> {
  /** The stored Markdown. Blank renders nothing: the empty state is the caller's to word. */
  markdown: string;
  /**
   * Draws a link the caller can resolve itself, like a documentation page's `./other-page.md`,
   * which only the app knows how to turn into its own route. `null` keeps the plain link, which
   * opens in a new tab. A `javascript:`, `data:` or `vbscript:` target never reaches it.
   */
  renderLink?: RenderLink;
  /**
   * Gives each heading its anchor id (`markdownHeadings`), so a contents list can jump to it. Off by
   * default: a board renders many texts at once and their ids would repeat.
   */
  headingIds?: boolean;
  /** The URL an image's source is drawn from, for the sources the caller owns (JAVA-798); without it every image is a placeholder. */
  resolveImage?: ResolveImage;
}

/** One extension list per resolver, so a re-render never rebuilds the schema. */
const WITH_IMAGES = new WeakMap<ResolveImage, ReturnType<typeof markdownSchema>>();

function schemaFor(resolveImage: ResolveImage | undefined) {
  if (!resolveImage) return markdownSchema();
  let schema = WITH_IMAGES.get(resolveImage);
  if (!schema) {
    schema = markdownExtensions({ resolveImage });
    WITH_IMAGES.set(resolveImage, schema);
  }
  return schema;
}

/**
 * Markdown drawn as formatted text, WITHOUT an editor: parsed with the same schema the editor
 * writes with, then rendered straight to React elements. No editor instance per comment, and the
 * text never reaches `dangerouslySetInnerHTML` (only a Mermaid diagram's SVG does, drawn by mermaid
 * in strict mode) -- raw HTML in the source is escaped or dropped by the schema, and a link whose
 * target is `javascript:` or `data:` is rendered with no target at all (TipTap's link check).
 *
 * A leading frontmatter block is not drawn (`parseMarkdown` leaves it out): showing a page's
 * metadata is the page's job, which knows what its fields mean.
 */
export function MarkdownView({ markdown, className, renderLink, headingIds, resolveImage, ...rest }: MarkdownViewProps) {
  if (!markdown.trim()) return null;
  const ids = headingIds ? markdownHeadings(markdown).map((heading) => heading.id) : null;
  let next = 0;
  const rendered = renderToReactElement({
    extensions: schemaFor(resolveImage),
    content: parseMarkdown(markdown),
    options: {
      nodeMapping: {
        taskItem: TaskItemView,
        table: TableView,
        tableCell: TableCellView,
        tableHeader: TableHeaderView,
        codeBlock: CodeBlockView,
        alert: AlertView,
        details: DetailsView,
        ...(ids && { heading: ({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) => headingElement(node, ids[next++], children) }),
        detailsSummary: DetailsSummaryView,
      },
      markMapping: renderLink ? { kbd: KbdView, link: LinkView } : { kbd: KbdView },
    },
  });
  return (
    <div className={className ? `jd-rich-text ${className}` : "jd-rich-text"} {...rest}>
      {renderLink ? <RenderLinkContext.Provider value={renderLink}>{rendered}</RenderLinkContext.Provider> : rendered}
    </div>
  );
}

const HEADING_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function headingElement(node: ProseMirrorNode, id: string | undefined, children: ReactNode) {
  const Tag = HEADING_TAGS[Math.min(Math.max(Number(node.attrs.level) || 1, 1), 6) - 1];
  return <Tag id={id}>{children}</Tag>;
}

/** Table cells: the default rendering hands React the HTML spellings `colspan`/`rowspan`. */
function TableCellView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  return (
    <td colSpan={node.attrs.colspan ?? 1} rowSpan={node.attrs.rowspan ?? 1}>
      {children}
    </td>
  );
}

function TableHeaderView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  return (
    <th colSpan={node.attrs.colspan ?? 1} rowSpan={node.attrs.rowspan ?? 1}>
      {children}
    </th>
  );
}

/**
 * A read-only checklist item. The default rendering passes `checked` to an interactive checkbox
 * with no handler (a React warning, and a control that looks clickable and is not): here the box
 * is disabled and named for its state, so it reads "Done" / "To do" before the item's text.
 */
function TaskItemView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  const checked = Boolean(node.attrs.checked);
  return (
    <li data-type="taskItem" data-checked={checked ? "true" : "false"}>
      <input type="checkbox" checked={checked} readOnly disabled aria-label={checked ? "Done" : "To do"} />
      <div>{children}</div>
    </li>
  );
}

/** A code block; a `mermaid` one is drawn as its diagram, loaded only when one is on the page. */
function CodeBlockView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  const language = typeof node.attrs.language === "string" ? node.attrs.language : null;
  if (language === "mermaid") return <MermaidDiagram source={node.textContent} />;
  return (
    <pre>
      <code className={language ? `language-${language}` : undefined}>{children}</code>
    </pre>
  );
}

/** A GitHub alert: a note whose kind is written out, so colour is never the only thing saying it. */
function AlertView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  const kind: AlertKind = (ALERT_KINDS as readonly string[]).includes(node.attrs.kind) ? node.attrs.kind : "NOTE";
  return (
    <div role="note" aria-label={ALERT_LABELS[kind]} className="jd-alert" data-alert={kind.toLowerCase()}>
      <p className="jd-alert-title">{ALERT_LABELS[kind]}</p>
      <div className="jd-alert-body">{children}</div>
    </div>
  );
}

/** Collapsed unless written `<details open>`. With no `<summary>`, the browser's own ("Details") shows. */
function DetailsView({ node, children }: { node: ProseMirrorNode; children?: ReactNode }) {
  return (
    <details className="jd-details" open={Boolean(node.attrs.open)}>
      {children}
    </details>
  );
}

function DetailsSummaryView({ children }: { children?: ReactNode }) {
  return <summary className="jd-details-summary">{children}</summary>;
}

function KbdView({ children }: { children?: ReactNode }) {
  return <kbd>{children}</kbd>;
}
