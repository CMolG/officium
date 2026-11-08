"use client";

import { useState, type ReactNode } from "react";
import { ChevronRight, Folder as FolderIcon } from "lucide-react";

import type { Folder } from "../../lib/backlog/types";
import { SidebarChildren } from "./SidebarChildren";
import { SidebarLink } from "./SidebarLink";
import { disclosureKeys, type Place } from "./sidebar-place";

/**
 * A folder of the workspace tree: a link that shows its projects on the home, plus a disclosure for
 * what it holds. Open by default, as the home's folder column always was: a project inside a closed
 * folder would hide the current one.
 */
export function SidebarFolderNode({ folder, empty, place, children }: { folder: Folder; empty: boolean; place: Place; children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const open = expanded || place.rail;

  return (
    <div>
      <div className="flex flex-row items-center" onKeyDown={empty ? undefined : disclosureKeys(expanded, setExpanded)}>
        {/* An empty folder has nothing to unfold, so no control -- a disabled one would need a
            reason on screen (`interface-psychology.md` #2); the gap keeps the names aligned. */}
        {!place.rail &&
          (empty ? (
            <span className="size-11 shrink-0" aria-hidden="true" />
          ) : (
            <button
              type="button"
              aria-label={`${expanded ? "Collapse" : "Expand"} ${folder.name}`}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-control)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06]"
            >
              <ChevronRight size={13} className={`transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
            </button>
          ))}
        <div className="min-w-0 flex-1">
          <SidebarLink
            href={`/app?folder=${folder.id}`}
            label={folder.name}
            icon={FolderIcon}
            current={place.homeFolderId === folder.id}
            rail={place.rail}
            onNavigate={place.onNavigate}
          />
        </div>
      </div>
      {open && !empty && <SidebarChildren rail={place.rail}>{children}</SidebarChildren>}
    </div>
  );
}
