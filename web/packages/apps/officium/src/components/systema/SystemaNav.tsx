"use client";

import { Network } from "lucide-react";
import { Link } from "@javadaba/ui/navigation";
import { NavItem } from "@javadaba/ui";

import { boardPath } from "../../lib/backlog/search-links";
import type { Copy } from "../../lib/i18n";
import { SYSTEMA_ENTRIES, systemaPath, type SystemaEntry } from "../../lib/systema/places";
import { SectionBack } from "../shell/SectionBack";

const ICON: Record<SystemaEntry, typeof Network> = { "system-design": Network };

/** The entries of Systema on the shared nav rows, under the way back to the board. It is the body of the frame and of the drawer. */
export function SystemaNav({
  projectId,
  current,
  onNavigate,
  copy,
}: {
  projectId: string;
  current: SystemaEntry | null;
  onNavigate?: () => void;
  copy: Copy["systema"];
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionBack href={boardPath(projectId)} label="Back to the board" onNavigate={onNavigate} />
      {SYSTEMA_ENTRIES.map((entry) => {
        const Icon = ICON[entry];
        return (
          <NavItem key={entry} asChild current={current === entry} className="min-h-11 gap-2 px-2">
            <Link href={systemaPath(projectId, entry)} onClick={onNavigate}>
              <Icon size={16} aria-hidden="true" />
              <span>{copy.entries[entry]}</span>
            </Link>
          </NavItem>
        );
      })}
    </div>
  );
}
