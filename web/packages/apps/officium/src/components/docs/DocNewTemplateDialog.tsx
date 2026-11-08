"use client";

import { useMemo, useState } from "react";
import { Select } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocPage, DocUpsertInput } from "../../lib/backlog/types";
import { templatePathFor } from "../../lib/docs/doc-template";
import { FIELD_SELECT } from "../../lib/field-select";
import { PageFormDialog } from "./PageFormDialog";
import { useDocTemplates } from "./use-doc-templates";

const PROJECT = "";

/** What a template dialog opens with: the collection it goes in (null: the project's), or the page it copies. */
export interface TemplateDraft {
  where: string | null;
  source?: DocPage;
}

/**
 * A new template (JAVA-801, design §6): a blank one placed by "Where" (the project's, offered in every
 * collection, or one collection's), or "Make a template" from a page, which copies its title and text into
 * a new template and leaves the page as it was. A template is never a draft: it is published as it is made.
 */
export function DocNewTemplateDialog({
  projectId,
  repository,
  draft,
  collections,
  takenPaths,
  onClose,
  onCreate,
}: {
  projectId: string;
  repository: BacklogRepository;
  draft: TemplateDraft;
  collections: { path: string; name: string }[];
  /** Every path the tree shows: a template can take none of them, nor another template's. */
  takenPaths: ReadonlySet<string>;
  onClose: () => void;
  onCreate: (path: string, input: DocUpsertInput) => Promise<string | null>;
}) {
  const [where, setWhere] = useState(draft.where ?? PROJECT);
  const { source } = draft;
  const { templates } = useDocTemplates(projectId, repository);
  const taken = useMemo(() => new Set([...takenPaths, ...(templates ?? []).map((t) => t.path)]), [takenPaths, templates]);

  const whereField = !source && (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Where</span>
      <Select
        aria-label="Where"
        value={where}
        onChange={setWhere}
        options={[{ value: PROJECT, label: "Project: offered everywhere" }, ...collections.map((c) => ({ value: c.path, label: c.name }))]}
        className={FIELD_SELECT}
      />
      <span className="text-xs text-[color:var(--jd-muted)]">It sets where the path starts. A template under a collection is offered there.</span>
    </label>
  );

  return (
    <PageFormDialog
      heading={source ? "Make a template" : "New template"}
      description={
        source
          ? `A copy of “${source.title}” becomes a template. The page stays as it is.${source.publishedAt === null ? " It is a draft: a template is visible to everyone in the project, so its text will be too." : ""}`
          : "Pages started from it copy its text, with {date}, {time}, {datetime} and {author} filled in."
      }
      submitLabel={source ? "Make template" : "Create template"}
      initialTitle={source?.title}
      initialPath={source ? templatePathFor(source.path) : undefined}
      pathPrefix={where ? `${where}/` : ""}
      takenPaths={taken}
      extra={whereField}
      onClose={onClose}
      onSubmit={({ title, path }) => onCreate(path, { title, body: source?.body ?? "", template: true })}
    />
  );
}
