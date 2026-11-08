import { useState } from "react";
import { Download, MoreHorizontal } from "lucide-react";
import { copyText, saveFile } from "@javadaba/sdk/platform";
import { Popover, PopoverContent, PopoverTrigger, Switch } from "@javadaba/ui";

import { OPTION_HOVER as HOVER, OPTION_ROW as ROW } from "./doc-page-option-row";
import { DocPageMoreOptions } from "./DocPageMoreOptions";
import { DocPageOptionActions } from "./DocPageOptionActions";

/**
 * "Page options" (JAVA-795): the word count, and the page as Markdown, copied or downloaded exactly
 * as stored, plus the page's own moves (`DocPageOptionActions`). There is no width switch: every page
 * reads at full width (JAVA-1537).
 */
export function DocPageOptions({
  body,
  path,
  showWordCount,
  onShowWordCount,
  onMakeTemplate,
  onMove,
  onDuplicate,
}: {
  body: string;
  path: string;
  showWordCount: boolean;
  onShowWordCount: (next: boolean) => void;
  /** Absent where the page can't become a template: a viewer, Officium's own pages, a template itself. */
  onMakeTemplate?: () => void;
  /** Absent where the person can't move or copy the page (JAVA-792). */
  onMove?: () => void;
  onDuplicate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<"idle" | "copied" | "refused">("idle");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setCopy("idle");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Page options"
          className="flex size-11 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-control-border)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)]"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-96 w-72 max-w-72 overflow-y-auto p-1.5">
        <div className="flex flex-col gap-0.5">
          <label className={`${ROW} ${HOVER}`}>
            <span>Show word count</span>
            <Switch checked={showWordCount} aria-label="Show word count" onCheckedChange={onShowWordCount} />
          </label>
          <DocPageOptionActions onMove={onMove} onDuplicate={onDuplicate} onMakeTemplate={onMakeTemplate} onClose={() => setOpen(false)} />
          <button
            type="button"
            className={`${ROW} ${HOVER}`}
            onClick={async () => setCopy((await copyText(`doc://${path}`)) ? "copied" : "refused")}
          >
            <span>Copy doc:// link</span>
          </button>
          <button
            type="button"
            className={`${ROW} ${HOVER}`}
            onClick={async () => setCopy((await copyText(body)) ? "copied" : "refused")}
          >
            <span>Copy as Markdown</span>
          </button>
          <button
            type="button"
            className={`${ROW} ${HOVER}`}
            onClick={() => void saveFile(new Blob([body], { type: "text/markdown;charset=utf-8" }), `${path.split("/").pop()}.md`)}
          >
            <span>Download as Markdown</span>
            <Download size={14} aria-hidden="true" />
          </button>
          <DocPageMoreOptions />
          {copy === "copied" && (
            <p role="status" className="px-3 pb-1 text-xs text-[color:var(--jd-muted)]">
              Copied
            </p>
          )}
          {copy === "refused" && (
            <p role="alert" className="px-3 pb-1 text-xs font-medium text-destructive">
              Couldn&apos;t copy: the browser didn&apos;t allow it. Download the file instead.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
