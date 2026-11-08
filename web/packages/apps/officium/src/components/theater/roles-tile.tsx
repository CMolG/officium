import { Badge, Text } from "@javadaba/ui";

import { CategoryMarker } from "../backlog/CategoryMarker";
import { StatusShape } from "../backlog/StatusShape";
import { roleLabel } from "../../lib/backlog/role-config";
import { runLabel } from "../../lib/backlog/role-matrix";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { Card } from "../../lib/backlog/types";

/** Two role chips, then how many more: a card with five roles reads as five roles, not as a wall. */
const CHIPS = 2;

/**
 * One card and the AI and effort that work it now. `was` is the same card under Officium's own
 * matrix, shown only when the scene changed it, so a viewer reads the difference in words.
 */
export function RolesTile({ card, was }: { card: Card; was: string | null }) {
  const roles = card.eligibleRoles;
  const run = card.runConfig ? runLabel(card.runConfig) : null;
  const changed = was !== null && run !== null && was !== run;
  return (
    <li data-testid="roles-tile" data-key={card.key} className="w-full min-w-0 p-2 @2xl:w-1/2 @4xl:w-1/3">
      <div className="flex h-full min-w-0 flex-col gap-2 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-3">
      <div className="flex min-w-0 flex-row items-center gap-2">
        <CategoryMarker category={card.category} />
        <Text className="text-xs font-bold text-[color:var(--jd-muted)]">{card.key}</Text>
        <span className="ml-auto flex flex-row items-center gap-1.5 text-xs font-medium">
          <StatusShape status={card.status} className="size-3.5" />
          {STATUS_CONFIG[card.status].label}
        </span>
      </div>
      <Text className="text-sm font-medium">{card.title}</Text>
      {roles.length > 0 && (
        <ul aria-label="Roles" className="flex flex-row flex-wrap gap-1.5">
          {roles.slice(0, CHIPS).map((role) => (
            <li key={role}>
              <Badge tone="neutral" fill="subtle" register="tag">
                {roleLabel(role)}
              </Badge>
            </li>
          ))}
          {roles.length > CHIPS && (
            <li>
              <Badge tone="neutral" fill="subtle" register="tag">{`+${roles.length - CHIPS}`}</Badge>
            </li>
          )}
        </ul>
      )}
      {run && (
        <div className="mt-auto flex flex-col gap-0.5">
          <Text className="text-xs font-medium">{`Worked with ${run}`}</Text>
          {changed && <Text className="text-xs text-[color:var(--jd-muted)]">{`was ${was}`}</Text>}
        </div>
      )}
      </div>
    </li>
  );
}
