import { ListTree } from "lucide-react";
import type { MarkdownHeading } from "@javadaba/rich-text";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import { DocContentsList } from "./DocContentsList";

/**
 * The Contents control of the page header (JAVA-795). From `lg` up it shows or hides the side panel;
 * below it, a phone has no room for a panel, so it opens the list in a popover that closes on a jump.
 * A page with no H1 to H4 shows it disabled, with the reason as its label.
 */
export function DocContentsButton({
  headings,
  panelShown,
  popoverOpen,
  onTogglePanel,
  onPopoverOpenChange,
  onJump,
}: {
  headings: MarkdownHeading[];
  panelShown: boolean;
  popoverOpen: boolean;
  onTogglePanel: () => void;
  onPopoverOpenChange: (open: boolean) => void;
  onJump: (id: string) => void;
}) {
  if (headings.length === 0) {
    return (
      <Button type="button" register="ui" size="sm" variant="outline" disabled>
        <ListTree size={14} aria-hidden="true" /> No headings
      </Button>
    );
  }
  return (
    <>
      <Button
        type="button"
        register="ui"
        size="sm"
        variant="outline"
        className="min-h-11 max-lg:hidden"
        aria-expanded={panelShown}
        aria-keyshortcuts="Control+Alt+H"
        onClick={onTogglePanel}
      >
        <ListTree size={14} aria-hidden="true" /> Contents
      </Button>
      <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            register="ui"
            size="sm"
            variant="outline"
            className="min-h-11 lg:hidden"
            aria-expanded={popoverOpen}
            aria-keyshortcuts="Control+Alt+H"
          >
            <ListTree size={14} aria-hidden="true" /> Contents
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 max-w-72 p-1">
          <DocContentsList
            headings={headings}
            onJump={(id) => {
              onPopoverOpenChange(false);
              onJump(id);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
