import { Paperclip } from "lucide-react";
import { Button } from "@javadaba/ui";

/** The page's bar button: icon and words, 44 px (layout floor L3). */
export function AttachButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" onClick={onClick}>
      <Paperclip size={14} aria-hidden="true" /> Attach
    </Button>
  );
}
