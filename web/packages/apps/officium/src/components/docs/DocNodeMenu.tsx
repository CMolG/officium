"use client";

import { MoreHorizontal } from "lucide-react";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import type { DocNodeAction } from "./doc-node-actions";

/** The `…` button of a node and the actions it lists (JAVA-791). Nothing renders without actions. */
export function DocNodeMenu({ name, actions }: { name: string; actions: DocNodeAction[] }) {
  if (actions.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${name}`}
          className="flex size-8 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.08] hover:text-[color:var(--jd-ink)]"
        >
          <MoreHorizontal size={14} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1">
        <ul className="flex flex-col gap-0.5">
          {actions.map((action) => (
            <li key={action.id}>
              {/* A chosen action closes the menu: the view stays mounted while it navigates (JAVA-1536). */}
              <PopoverClose asChild>
                <button
                  type="button"
                  onClick={action.run}
                  className={`flex min-h-11 w-full flex-row items-center rounded-[var(--radius-jd-sm)] px-3 text-left text-sm hover:bg-[color:var(--jd-ink)]/[0.06] ${
                    action.danger ? "text-destructive" : ""
                  }`}
                >
                  {action.label}
                </button>
              </PopoverClose>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
