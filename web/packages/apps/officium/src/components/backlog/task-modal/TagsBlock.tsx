"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";

import { Input } from "@javadaba/ui";

import type { CardDetail } from "../../../lib/backlog/types";

/** The card's tags: each removable, one more added with Enter (Off-Card, "now editable"). A viewer reads them. */
export function TagsBlock({ detail, readOnly, save }: { detail: CardDetail; readOnly: boolean; save: (tags: string[]) => Promise<void> }) {
  const [draft, setDraft] = useState("");
  if (readOnly && detail.tags.length === 0) return null;

  function add() {
    const tag = draft.trim();
    setDraft("");
    if (tag && !detail.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) void save([...detail.tags, tag]);
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Tags</h3>
      {detail.tags.length > 0 && (
        <ul aria-label="Tags" className="flex flex-row flex-wrap gap-2">
          {detail.tags.map((tag) => (
            <li key={tag} className="flex flex-row items-center gap-1 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] py-0.5 pl-2 pr-1 text-xs font-semibold uppercase">
              <Tag size={10} aria-hidden="true" /> {tag}
              {!readOnly && (
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => void save(detail.tags.filter((t) => t !== tag))}
                  className="flex size-6 flex-row items-center justify-center rounded-[var(--radius-jd-xs)] hover:bg-[color:var(--jd-hover)]"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <Input
          register="ui"
          aria-label="Add a tag"
          placeholder="Add a tag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          className={detail.tags.length > 0 ? "mt-2" : undefined}
        />
      )}
    </div>
  );
}
