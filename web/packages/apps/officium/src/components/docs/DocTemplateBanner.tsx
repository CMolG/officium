import { FilePlus } from "lucide-react";
import { Button, Note } from "@javadaba/ui";

import type { DocPage } from "../../lib/backlog/types";

/**
 * What a template says above its text (JAVA-801), in words: it is not a page of the tree, and what a page made
 * from it gets. An editor starts one from here. It names the variables as written, so a reader of the template
 * knows the braces are meant.
 */
export function DocTemplateBanner({
  page,
  canWrite,
  onNewPage,
}: {
  page: DocPage;
  canWrite: boolean;
  onNewPage: () => void;
}) {
  if (!page.template) return null;
  return (
    <Note tone="info" role="status" data-testid="template-banner">
      <div className="flex flex-row flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 basis-56">
        Template: it is not in the tree or the search. A page made from it copies this text, with {"{date}"}, {"{time}"},{" "}
        {"{datetime}"} and {"{author}"} filled in.
      </p>
      {canWrite && (
        <Button type="button" register="ui" size="sm" onClick={onNewPage}>
          <FilePlus size={14} aria-hidden="true" /> New page from this template
        </Button>
      )}
      </div>
    </Note>
  );
}
