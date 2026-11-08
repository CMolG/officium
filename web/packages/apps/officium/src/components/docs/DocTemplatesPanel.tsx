"use client";

import { LayoutTemplate, Plus } from "lucide-react";
import { Button } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTemplate, DocTreeNode } from "../../lib/backlog/types";
import { DocTemplateGroup } from "./DocTemplateGroup";
import { useDocTemplates } from "./use-doc-templates";

interface Group {
  key: string;
  name: string;
  hint: string;
  templates: DocTemplate[];
}

/** The project's templates first, then each collection's in the tree's order; a collection the tree no longer shows by its segment. */
function groupsOf(templates: DocTemplate[], collections: DocTreeNode[]): Group[] {
  const own = templates.filter((t) => t.collection === null);
  const groups: Group[] = own.length > 0 ? [{ key: "", name: "Project", hint: "Offered in every collection", templates: own }] : [];
  const keys = [...collections.map((c) => c.path), ...templates.map((t) => t.collection ?? "")];
  for (const key of [...new Set(keys)].filter(Boolean)) {
    const inIt = templates.filter((t) => t.collection === key);
    const name = collections.find((c) => c.path === key)?.name ?? key;
    if (inIt.length > 0) groups.push({ key, name, hint: `Offered in ${name}`, templates: inIt });
  }
  return groups;
}

/**
 * The Templates section (JAVA-801, design §6): pages to start new pages from, out of the tree and the search,
 * grouped by where they are offered. It has its empty, loading and error states, and New template for editors.
 */
export function DocTemplatesPanel({
  projectId,
  repository,
  collections,
  canWrite,
  liveTick,
  onNewTemplate,
  onNewFromTemplate,
}: {
  projectId: string;
  repository: BacklogRepository;
  collections: DocTreeNode[];
  canWrite: boolean;
  liveTick: number;
  onNewTemplate: () => void;
  onNewFromTemplate: (template: DocTemplate) => void;
}) {
  const { templates, error, retry } = useDocTemplates(projectId, repository, liveTick);

  let body;
  if (templates === null) {
    body = error ? (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
        <p className="text-sm font-semibold">Couldn&apos;t load the templates</p>
        <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
        <Button type="button" register="ui" variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    ) : (
      <p role="status" className="text-sm text-[color:var(--jd-muted)]">
        Loading the templates…
      </p>
    );
  } else if (templates.length === 0) {
    body = (
      <div className="flex flex-col gap-1 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
        <p className="text-base font-semibold">No templates yet</p>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
          {canWrite
            ? "Turn any page into one with Page options → Make a template, or start a blank one with New template."
            : "Editors make templates. Once there is one, new pages can start from it."}
        </p>
      </div>
    );
  } else {
    body = groupsOf(templates, collections).map((group) => (
      <DocTemplateGroup
        key={group.key}
        projectId={projectId}
        name={group.name}
        hint={group.hint}
        templates={group.templates}
        canWrite={canWrite}
        onNewFromTemplate={onNewFromTemplate}
      />
    ));
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Templates" data-testid="doc-templates">
      <header className="flex flex-col gap-1 border-b border-[color:var(--jd-line)] pb-4">
        <div className="flex flex-row flex-wrap items-center justify-between gap-3">
          <h2 className="flex flex-row items-center gap-2 text-2xl font-bold">
            <LayoutTemplate size={20} aria-hidden="true" /> Templates
          </h2>
          {canWrite && (
            <Button type="button" register="ui" size="sm" onClick={onNewTemplate}>
              <Plus size={14} aria-hidden="true" /> New template
            </Button>
          )}
        </div>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
          Pages to start new pages from. A template stays out of the tree and the search, and a page made from it gets
          its text with {"{date}"}, {"{time}"}, {"{datetime}"} and {"{author}"} filled in.
        </p>
      </header>
      {body}
    </section>
  );
}
