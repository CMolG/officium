"use client";

import { Suspense } from "react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocListState, DocPageSummary, DocTemplate, DocTreeNode } from "../../lib/backlog/types";
import { ARCHIVE_PATH, CHANGELOG_PATH, RECENT_PATH, SEARCH_PATH, TEMPLATES_PATH, TEST_HISTORY_PATH, TRASH_PATH, UNPUBLISHED_PATH } from "../../lib/docs/doc-path";
import { ChangelogPanel } from "./ChangelogPanel";
import { DocRecentPanel } from "./DocRecentPanel";
import { DocSearchPanel } from "./DocSearchPanel";
import { DocStatePanel } from "./DocStatePanel";
import { DocTemplatesPanel } from "./DocTemplatesPanel";
import { TestHistoryPanel } from "./TestHistoryPanel";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLocked } from "../cloud/CloudLocked";

/** The reserved paths that are sections rather than pages, and which one each is. */
const SECTIONS: Readonly<Record<string, "changelog" | "tests" | "recent" | "search" | "templates" | DocListState>> = {
  [CHANGELOG_PATH]: "changelog",
  [TEST_HISTORY_PATH]: "tests",
  [RECENT_PATH]: "recent",
  [SEARCH_PATH]: "search",
  [TEMPLATES_PATH]: "templates",
  [UNPUBLISHED_PATH]: "unpublished",
  [ARCHIVE_PATH]: "archived",
  [TRASH_PATH]: "trash",
};

export type DocsSection = (typeof SECTIONS)[string];

/** The section a path opens, or null when it is a page. */
export function sectionOf(path: string | null): DocsSection | null {
  return SECTIONS[path ?? ""] ?? null;
}

/**
 * The sections the sidebar pins above the tree (JAVA-131, JAVA-793, JAVA-799, JAVA-800, JAVA-801): the changelog,
 * the test history, Recent, Search, Templates and the lifecycle's three lists. Each reads on its own, again on
 * `liveTick`.
 */
export function DocsSectionPanel({
  section,
  projectId,
  repository,
  pages,
  collections,
  canWrite,
  isOwner,
  liveTick,
  onChanged,
  onNewTemplate,
  onNewFromTemplate,
}: {
  section: DocsSection;
  projectId: string;
  repository: BacklogRepository;
  /** Every page a changelog entry can name: the project's and Officium's own. */
  pages: DocPageSummary[];
  collections: DocTreeNode[];
  canWrite: boolean;
  isOwner: boolean;
  liveTick: number;
  onChanged: () => void;
  onNewTemplate: () => void;
  onNewFromTemplate: (template: DocTemplate) => void;
}) {
  if (IS_LOCAL && (section === "changelog" || section === "tests")) {
    return <CloudLocked feature={section === "changelog" ? "changelog" : "testHistory"} />;
  }
  if (section === "changelog") {
    return <ChangelogPanel projectId={projectId} repository={repository} pages={pages} canWrite={canWrite} isOwner={isOwner} />;
  }
  if (section === "tests") return <TestHistoryPanel projectId={projectId} repository={repository} />;
  if (section === "recent") return <DocRecentPanel projectId={projectId} repository={repository} liveTick={liveTick} />;
  if (section === "search") {
    return (
      <Suspense fallback={null}>
        <DocSearchPanel projectId={projectId} repository={repository} collections={collections} />
      </Suspense>
    );
  }
  if (section === "templates") {
    return (
      <DocTemplatesPanel
        projectId={projectId}
        repository={repository}
        collections={collections}
        canWrite={canWrite}
        liveTick={liveTick}
        onNewTemplate={onNewTemplate}
        onNewFromTemplate={onNewFromTemplate}
      />
    );
  }
  return (
    <DocStatePanel
      key={section}
      projectId={projectId}
      repository={repository}
      state={section}
      liveTick={liveTick}
      canWrite={canWrite}
      onChanged={onChanged}
    />
  );
}
