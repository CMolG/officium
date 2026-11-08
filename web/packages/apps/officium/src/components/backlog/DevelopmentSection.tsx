import { GitBranch, GitCommitHorizontal, GitMerge, GitPullRequest, GitPullRequestClosed } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Text } from "@javadaba/ui";

import type { CardDetail, DevLink } from "../../lib/backlog/types";

const KIND: Record<DevLink["kind"], string> = { commit: "Commit", branch: "Branch", pullRequest: "Pull request" };

/**
 * The commits, branches and pull requests on GitHub that name this card (JAVA-375), like Jira's
 * development panel. Officium fills it from GitHub's own events; nobody writes here, so the empty
 * state says how a link appears instead of offering a button.
 */
export function DevelopmentSection({ detail }: { detail: CardDetail }) {
  return (
    <section aria-label="Development" className="flex flex-col gap-3">
      <h3 className="flex flex-row items-center gap-2 border-b border-[color:var(--jd-line)] pb-2 text-sm font-bold uppercase tracking-wide">
        <GitBranch size={16} /> Development
      </h3>
      {detail.development.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {detail.development.map((link) => (
            <li
              key={`${link.kind}:${link.repo}:${link.ref}`}
              className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3"
            >
              <span className="shrink-0 text-[color:var(--jd-muted)]">{icon(link)}</span>
              <div className="min-w-0 flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-bold underline-offset-4 hover:underline"
                >
                  <Text>{link.title || link.ref}</Text>
                </a>
                <p className="truncate font-[family-name:var(--font-jd-kicker)] text-xs text-[color:var(--jd-muted)]">
                  {KIND[link.kind]} · {label(link)} · {link.repo}
                  {link.author ? ` · ${link.author}` : ""}
                </p>
              </div>
              <Badge register="tag" tone={link.state === "open" ? "accent" : "neutral"} fill="subtle" size="sm">
                <Text>{link.state}</Text>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm font-medium italic text-[color:var(--jd-muted)]">
          Nothing on GitHub names {detail.key} yet. Put the key in a commit message, a branch name or a pull request, and
          it shows up here.
        </p>
      )}
    </section>
  );
}

function icon(link: DevLink): ReactNode {
  if (link.kind === "commit") return <GitCommitHorizontal size={16} aria-hidden="true" />;
  if (link.kind === "branch") return <GitBranch size={16} aria-hidden="true" />;
  if (link.state === "merged") return <GitMerge size={16} aria-hidden="true" />;
  if (link.state === "closed") return <GitPullRequestClosed size={16} aria-hidden="true" />;
  return <GitPullRequest size={16} aria-hidden="true" />;
}

function label(link: DevLink): string {
  if (link.kind === "commit") return link.ref.slice(0, 7);
  if (link.kind === "pullRequest") return `#${link.ref}`;
  return link.ref;
}
