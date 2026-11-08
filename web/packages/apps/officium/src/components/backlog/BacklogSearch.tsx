"use client";

import { Search, X } from "lucide-react";

import { Button, Input } from "@javadaba/ui";

/**
 * The backlog's search box: the board's own (same placeholder, same icon), plus a Clear while it holds text.
 * The browser's own cancel button is hidden so Clear is the one way to empty it.
 */
export function BacklogSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-row items-center gap-2">
      <div className="relative min-w-0 grow">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--jd-faint)]" size={16} aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search the backlog"
          placeholder="Search the backlog…"
          className="pl-9 [&::-webkit-search-cancel-button]:hidden"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {value && (
        <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 shrink-0" onClick={() => onChange("")}>
          <X size={14} aria-hidden="true" /> Clear
        </Button>
      )}
    </div>
  );
}
