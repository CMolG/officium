import { FilePlus } from "lucide-react";
import { Button, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { docsPath } from "../../lib/backlog/search-links";
import type { DocTemplate } from "../../lib/backlog/types";

/**
 * One group of the Templates section (JAVA-801): the project's own, or one collection's. Each template opens
 * as a page, and an editor can start a new page from it right here.
 */
export function DocTemplateGroup({
  projectId,
  name,
  hint,
  templates,
  canWrite,
  onNewFromTemplate,
}: {
  projectId: string;
  name: string;
  /** Where the group's templates are offered, in words. */
  hint: string;
  templates: DocTemplate[];
  canWrite: boolean;
  onNewFromTemplate: (template: DocTemplate) => void;
}) {
  return (
    <section aria-label={`${name} templates`} className="flex flex-col gap-2">
      <h3 className="flex flex-row flex-wrap items-baseline gap-x-2 text-sm font-semibold">
        <span>{name}</span>
        <span className="text-xs font-normal text-[color:var(--jd-muted)]">{hint}</span>
      </h3>
      <ul className="flex flex-col gap-2">
        {templates.map((template) => (
          <li
            key={template.id}
            data-testid="doc-template-row"
            className="flex flex-row flex-wrap items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] px-3 py-2"
          >
            <Link href={docsPath(projectId, template.path)} className="flex min-h-11 min-w-0 flex-1 basis-48 flex-col justify-center">
              <Text className="truncate text-sm font-semibold">{template.title}</Text>
              <Text className="truncate font-mono text-xs text-[color:var(--jd-muted)]">{template.path}</Text>
            </Link>
            {canWrite && (
              <Button type="button" register="ui" size="sm" variant="outline" onClick={() => onNewFromTemplate(template)}>
                <FilePlus size={14} aria-hidden="true" /> New page from it
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
