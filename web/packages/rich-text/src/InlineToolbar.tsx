"use client";

import type { Editor } from "@tiptap/react";
import { Bold, Italic, Link2, Link2Off } from "lucide-react";
import { useState } from "react";

import { ToolbarButton } from "./toolbar";

export function InlineToolbar({ editor, label }: { editor: Editor; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const active = (name: string) => editor.isActive(name);
  return (
    <div
      role="toolbar"
      aria-label={`${label} formatting`}
      className="flex flex-row flex-wrap items-center gap-0.5 border-b border-[color:var(--jd-line)] px-1 py-1"
    >
      <ToolbarButton active={active("bold")} onClick={() => editor.chain().focus().toggleMark("bold").run()} title="Bold" icon={Bold} />
      <ToolbarButton active={active("italic")} onClick={() => editor.chain().focus().toggleMark("italic").run()} title="Italic" icon={Italic} />
      <ToolbarButton active={active("link")} onClick={() => setUrl(editor.getAttributes("link").href ?? "https://")} title="Link" icon={Link2} />
      {active("link") && (
        <ToolbarButton onClick={() => editor.chain().focus().unsetMark("link").run()} title="Remove link" icon={Link2Off} />
      )}
      {url !== null && (
        <form
          className="flex flex-row items-center gap-1 pl-1"
          onSubmit={(event) => {
            event.preventDefault();
            const chain = editor.chain().focus().extendMarkRange("link");
            (url.trim() ? chain.setMark("link", { href: url.trim() }) : chain.unsetMark("link")).run();
            setUrl(null);
          }}
        >
          <input
            aria-label="Link address"
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-8 w-56 rounded border border-[color:var(--jd-control-border)] bg-transparent px-2 text-sm"
          />
          <button type="submit" className="h-8 px-2 text-sm">
            <span>Apply</span>
          </button>
        </form>
      )}
    </div>
  );
}
