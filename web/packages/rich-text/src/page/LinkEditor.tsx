"use client";

import type { Editor } from "@tiptap/react";
import { Check, X } from "lucide-react";
import { useState } from "react";

import { Input } from "@javadaba/ui";

import { ToolbarButton } from "../toolbar";

/**
 * The link's address, typed (JAVA-796): Enter applies, Escape goes back to the text unchanged. An
 * empty address removes the link. A page is linked by title with `[[`; this is for the web.
 */
export function LinkEditor({ editor, initial, onDone }: { editor: Editor; initial: string; onDone: () => void }) {
  const [href, setHref] = useState(initial || "https://");
  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange("link");
    (href.trim() && href.trim() !== "https://" ? chain.setLink({ href: href.trim() }) : chain.unsetLink()).run();
    onDone();
  };
  return (
    <div className="flex flex-row items-center gap-0.5">
      <Input
        type="url"
        value={href}
        onChange={(event) => setHref(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        aria-label="Link address"
        autoFocus
        className="h-8 w-56 px-2 md:text-xs pointer-coarse:h-11"
      />
      <ToolbarButton title="Apply link" icon={Check} onClick={apply} />
      <ToolbarButton title="Cancel" icon={X} onClick={onDone} />
    </div>
  );
}
