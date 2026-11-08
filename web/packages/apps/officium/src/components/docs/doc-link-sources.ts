import type { LinkSources } from "@javadaba/rich-text";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type DocPage, type Member } from "../../lib/backlog/types";
import { searchMembers, searchPages } from "../../lib/docs/doc-link-search";
import { newPagePath } from "../../lib/docs/doc-path";

/** Where `[[` and `@` look in a page being edited: the project's pages and members, and a new page by title. */
export function buildLinkSources({ repository, projectId, page, titles, takenPaths, members, onChanged }: {
  repository: BacklogRepository;
  projectId: string;
  page: DocPage;
  titles: ReadonlyMap<string, string>;
  takenPaths: ReadonlySet<string>;
  members: Member[] | null;
  onChanged: () => void;
}): LinkSources {
  return {
    pages: (query) => searchPages(titles, query, page.path),
    members: (query) => (members === null ? null : searchMembers(members, query)),
    createPage: async (title) => {
      const path = newPagePath(page.path, title, takenPaths);
      const created = await repository.upsertDoc(projectId, path, { title, body: "", draft: page.publishedAt === null });
      if (isConflict(created)) throw new Error(`another page already lives at ${path}`);
      onChanged();
      return { href: `doc://${path}`, title: created.title };
    },
  };
}
