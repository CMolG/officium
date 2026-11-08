import type { ReactNode } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Badge, NavItem } from "@javadaba/ui";

/** One pinned entry of the documentation tree: the changelog, the test history, your unpublished drafts,
 *  the archive, the trash, or one of Officium's own pages. `badge` is text, never color alone. */
export function DocSectionLink({
  href,
  icon,
  label,
  current,
  testId,
  badge,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  current: boolean;
  testId?: string;
  badge?: string | null;
  onNavigate: () => void;
}) {
  return (
    <NavItem asChild current={current} className="min-h-11 gap-2 px-2 py-1.5">
      <Link href={href} onClick={onNavigate} data-testid={testId}>
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {badge && (
          <Badge register="tag" tone="warning" fill="subtle" size="xs" className="shrink-0">
            {badge}
          </Badge>
        )}
      </Link>
    </NavItem>
  );
}
