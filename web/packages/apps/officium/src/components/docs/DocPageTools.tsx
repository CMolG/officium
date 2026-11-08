import { History } from "lucide-react";
import { Button } from "@javadaba/ui";

import type { DocPage } from "../../lib/backlog/types";
import { DocContentsButton } from "./DocContentsButton";
import { DocPageOptions } from "./DocPageOptions";
import type { useDocReading } from "./use-doc-reading";

/**
 * The reading tools of a page's header (JAVA-795, JAVA-1537): History, Contents and Page options. History and Contents
 * share the page's side column, so opening one closes the other. Comments are not a tool: they sit at the end of the
 * page and on their passages (JAVA-1538).
 */
export function DocPageTools({
  page,
  reading,
  historyShown,
  onToggleHistory,
  onMove,
  onDuplicate,
  onMakeTemplate,
}: {
  page: DocPage;
  reading: Omit<ReturnType<typeof useDocReading>, "bodyRef">;
  historyShown: boolean;
  /** Absent where a page keeps no history (Officium's own pages). */
  onToggleHistory?: () => void;
  onMove?: () => void;
  onDuplicate?: () => void;
  onMakeTemplate?: () => void;
}) {
  return (
    <>
      {onToggleHistory && (
        <Button
          type="button"
          register="ui"
          size="sm"
          variant="outline"
          className="min-h-11"
          aria-pressed={historyShown}
          onClick={onToggleHistory}
        >
          <History size={14} aria-hidden="true" /> History
        </Button>
      )}
      <DocContentsButton
        headings={reading.headings}
        panelShown={reading.panelShown && !historyShown}
        popoverOpen={reading.popoverOpen}
        onTogglePanel={() => {
          if (historyShown) {
            onToggleHistory?.();
            reading.setPanelShown(true);
          } else {
            reading.setPanelShown(!reading.panelShown);
          }
        }}
        onPopoverOpenChange={reading.setPopoverOpen}
        onJump={reading.jump}
      />
      <DocPageOptions
        body={page.body}
        path={page.path}
        showWordCount={reading.showWordCount}
        onShowWordCount={reading.setShowWordCount}
        onMove={onMove}
        onDuplicate={onDuplicate}
        onMakeTemplate={onMakeTemplate}
      />
    </>
  );
}
