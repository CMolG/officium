import { FileText } from "lucide-react";
import { isMemberLink, MarkdownView } from "@javadaba/rich-text";
import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import { formatBytes, parseFileUri, type DocFileContext } from "../../lib/docs/doc-files";
import { bodyPagePath } from "../../lib/docs/doc-links";

interface Props {
  projectId: string;
  path: string;
  body: string;
  /** Where the page's files are read from, and what each is (JAVA-798). */
  files?: DocFileContext;
}

/**
 * A page's text, read: a link to another page of the project opens it in the app (JAVA-784), with
 * the same rule its `related` pages use; a mention (`[@Name](member://<accountId>)`, JAVA-796) is a
 * person, drawn as a chip and not a link; any other link is left to MarkdownView. An empty page
 * says so. An editor never sees this: the page is edited in place.
 */
export function DocBody({ projectId, path, body, files }: Props) {
  if (!body.trim()) {
    return (
      <div className="flex flex-row rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-4 py-3">
        <p className="text-sm text-[color:var(--jd-muted)]">This page has no text yet.</p>
      </div>
    );
  }
  return (
    <MarkdownView
      markdown={body}
      headingIds
      resolveImage={files?.resolve}
      className="text-pretty text-base leading-relaxed text-[color:var(--jd-ink)]/85"
      renderLink={(href, children) => {
        if (isMemberLink(href)) {
          return (
            <span className="rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-1 font-medium text-[color:var(--jd-ink)]" data-mention="">
              {children}
            </span>
          );
        }
        const attachment = parseFileUri(href);
        if (attachment && files) {
          const info = files.info.get(href);
          const url = files.resolve(href);
          return (
            <a href={url ?? undefined} download={attachment.name} className="inline-flex min-h-11 flex-row items-center gap-1.5 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-2 align-middle text-sm font-medium">
              <FileText size={14} aria-hidden="true" />
              {children}
              {info && <span className="text-xs font-normal text-[color:var(--jd-muted)]">{info.contentType.split("/").pop()?.toUpperCase()} · {formatBytes(info.storedBytes)}</span>}
            </a>
          );
        }
        const target = bodyPagePath(path, href);
        return target ? <Link href={docsPath(projectId, target)}>{children}</Link> : null;
      }}
    />
  );
}
