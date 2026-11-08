"use client";

import { Eye } from "lucide-react";
import { Button } from "@javadaba/ui";

import { stopFollowing, useFollowing } from "../../lib/docs/room/follow-store";

/**
 * "Following Ana · Stop" (JAVA-803, observer mode): says whose caret or viewport the page is keeping in
 * view, and how to stop. Scrolling, typing, a click and Esc stop it too, and the words never depend on colour.
 */
export function DocFollowBar() {
  const following = useFollowing();
  if (!following) return null;
  return (
    <div
      role="status"
      data-testid="doc-follow-bar"
      className="sticky top-2 z-10 flex min-h-11 flex-row items-center gap-2 self-start rounded-[var(--radius-jd-md)] border border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)] px-3 text-sm"
    >
      <Eye size={14} aria-hidden="true" />
      <span>
        Following <span className="font-medium">{following.name}</span>
      </span>
      <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11" onClick={stopFollowing}>
        Stop <span className="text-[color:var(--jd-muted)]">(Esc)</span>
      </Button>
    </div>
  );
}
