"use client";

import { Link } from "@javadaba/ui/navigation";
import { Badge, NavItem } from "@javadaba/ui";
import type { LayoutDashboard } from "lucide-react";

/**
 * One entry of the workspace tree (Off-Shell, the sidebar's `sl`): the shared `NavItem`, so the page
 * you are on is marked twice (a raised pill and a heavier weight) and a folded rail gets its 44 px
 * icon targets for free. Folded, the name stays for assistive technology (`aria-label`) and as a
 * tooltip (`title`), and a badge keeps being said in words.
 */
export function SidebarLink({
  href,
  label,
  icon: Icon,
  badge,
  badgeTone = "neutral",
  current,
  rail,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** A short count said in words ("3 pending"), so it never leans on color alone. */
  badge?: string;
  badgeTone?: "neutral" | "info";
  current: boolean;
  rail: boolean;
  onNavigate: () => void;
}) {
  const name = badge ? `${label}, ${badge}` : label;
  return (
    <NavItem asChild current={current} folded={rail}>
      <Link
        href={href}
        onClick={onNavigate}
        aria-label={rail ? name : undefined}
        title={rail ? name : undefined}
        className="jd-motion min-w-0 gap-2 px-2 active:scale-[0.98]"
      >
        <Icon size={15} className="shrink-0" aria-hidden="true" />
        <span className={badge ? "min-w-fit flex-1" : "min-w-0 flex-1 truncate"}>{label}</span>
        {badge && (
          <Badge register="tag" size="xs" tone={badgeTone} fill="subtle" className="shrink-0">
            {badge}
          </Badge>
        )}
      </Link>
    </NavItem>
  );
}
