"use client";

import { Link } from "@javadaba/ui/navigation";
import { Glyph, SidebarBack } from "@javadaba/ui";

/**
 * The way out of a section that took the sidebar over (Lib-Chrome, "Sidebar fold"): Documentation, Configuration and Systema
 * each list their own pages, and this is the first row of that list, back to the board the section belongs to.
 */
export function SectionBack({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  return (
    <SidebarBack asChild>
      <Link href={href} onClick={onNavigate}>
        <Glyph name="chevron-left" size={14} />
        <span>{label}</span>
      </Link>
    </SidebarBack>
  );
}
