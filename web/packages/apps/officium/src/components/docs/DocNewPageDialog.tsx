"use client";

import { useMemo, useState } from "react";
import { useAuthSession } from "@javadaba/account";
import { Select } from "@javadaba/ui";

import { USES_MEMORY_BACKEND } from "../../lib/backlog/get-repository";
import { YOU as CURRENT_USER } from "../../lib/backlog/memory-seed";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocUpsertInput } from "../../lib/backlog/types";
import { callerTimeZone, fillTemplate } from "../../lib/docs/doc-template";
import { useNow } from "../../lib/docs/use-now";
import { FIELD_SELECT } from "../../lib/field-select";
import { PageFormDialog } from "./PageFormDialog";
import type { PageDraft } from "./use-doc-tree-mutations";
import { useDocTemplates } from "./use-doc-templates";
import { NewPageIcon } from "./NewPageIcon";
import { DEFAULT_PAGE_ICON, iconFromTitle } from "../../lib/docs/icon-from-title";

const BLANK = "";

/**
 * A new page (JAVA-131), or a node's overview page, with "Start from" (JAVA-801): a blank page, or one of the
 * project's templates or the collection's it goes in. A template's title shows filled until the person types
 * their own; left as shown, the server fills it too, so `{author}` is the name it writes. The page is an
 * unpublished draft, like every page made here.
 */
export function DocNewPageDialog({
  projectId,
  repository,
  draft,
  takenPaths,
  onClose,
  onCreate,
}: {
  projectId: string;
  repository: BacklogRepository;
  draft: PageDraft;
  takenPaths: ReadonlySet<string>;
  onClose: () => void;
  onCreate: (path: string, input: DocUpsertInput, icon?: string) => Promise<string | null>;
}) {
  const { templates, error } = useDocTemplates(projectId, repository);
  const [choice, setChoice] = useState(draft.fromTemplate ?? BLANK);
  // The icon the person picked; until then the title decides (JAVA-1765).
  const [pickedIcon, setPickedIcon] = useState<string | null>(null);
  const { session } = useAuthSession();
  const now = useNow(60_000);
  const collection = (draft.path ?? draft.prefix ?? "").split("/")[0] || null;
  const offered = (templates ?? []).filter((t) => t.collection === null || t.collection === collection);
  const template = offered.find((t) => t.path === choice) ?? null;
  const author = session?.email ?? (USES_MEMORY_BACKEND ? CURRENT_USER.name : "");
  const suggested = template ? fillTemplate(template.title, new Date(now), callerTimeZone(), author) : undefined;
  const taken = useMemo(() => new Set([...takenPaths, ...(templates ?? []).map((t) => t.path)]), [takenPaths, templates]);

  const startFrom =
    offered.length > 0 ? (
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Start from</span>
        <Select
          aria-label="Start from"
          value={template ? template.path : BLANK}
          onChange={setChoice}
          options={[{ value: BLANK, label: "Blank page" }, ...offered.map((t) => ({ value: t.path, label: t.title }))]}
          className={FIELD_SELECT}
        />
      </label>
    ) : error ? (
      <p role="status" className="text-xs text-[color:var(--jd-muted)]">
        Couldn&apos;t load the templates, so this page starts blank.
      </p>
    ) : null;

  return (
    <PageFormDialog
      heading={draft.path ? "Create the overview page" : "New page"}
      description="Give it a title; the path places it in the tree."
      submitLabel="Create page"
      initialTitle={draft.title}
      initialPath={draft.path}
      pathPrefix={draft.prefix}
      suggestedTitle={suggested}
      takenPaths={taken}
      extra={({ title }) => (
        <>
          {startFrom}
          <NewPageIcon icon={pickedIcon ?? iconFromTitle(title)} title={title} chosen={pickedIcon !== null} onChoose={setPickedIcon} />
        </>
      )}
      onClose={onClose}
      onSubmit={({ title, path }) => {
        const icon = pickedIcon ?? iconFromTitle(title);
        return onCreate(
          path,
          template
            ? { ...(title === suggested ? {} : { title }), draft: true, fromTemplate: template.path, timeZone: callerTimeZone() }
            : { title, body: "", draft: true },
          icon === DEFAULT_PAGE_ICON ? undefined : icon,
        );
      }}
    />
  );
}
