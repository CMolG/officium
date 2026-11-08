import { Badge } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { modLabel, modSheetHref, roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { runLabel } from "../../lib/backlog/role-matrix";
import type { Card } from "../../lib/backlog/types";

/** The roles that follow the same mods, together: the usual card has one group, so it reads one line, not one per role. */
function modGroups(card: Pick<Card, "eligibleRoles" | "mods">): { roles: string[]; mods: string[] }[] {
  const groups = new Map<string, { roles: string[]; mods: string[] }>();
  for (const role of card.eligibleRoles) {
    const mods = card.mods?.[role] ?? [];
    if (mods.length === 0) continue;
    const group = groups.get(mods.join(",")) ?? { roles: [], mods };
    group.roles.push(role);
    groups.set(mods.join(","), group);
  }
  return [...groups.values()];
}

/**
 * Who may work a card now, and with which model and effort (JAVA-915), and the mods each role follows (JAVA-1569): each role leads to its
 * sheet (JAVA-517). The model is said once, the cell's, and then only for a role that differs, so
 * the usual card (every role the same) reads one line, not one per role. The server already
 * resolved both, so nothing is recomputed here.
 */
export function CardRoles({ card }: { card: Pick<Card, "eligibleRoles" | "runConfig" | "runConfigs" | "mods" | "status" | "category"> }) {
  const differ = card.runConfig
    ? card.eligibleRoles.filter((role) => {
        const own = card.runConfigs?.[role];
        return own && (own.model !== card.runConfig!.model || own.effort !== card.runConfig!.effort);
      })
    : [];
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Roles for this status</h3>
      {card.eligibleRoles.length > 0 ? (
        <ul data-testid="card-eligible-roles" aria-label="Roles for this status" className="flex flex-row flex-wrap gap-1.5">
          {card.eligibleRoles.map((role) => (
            <li key={role} data-role={role}>
              <Link href={roleSheetHref(role)} className="flex min-h-11 flex-row items-center rounded-[var(--radius-jd-sm)]">
                <Badge tone="neutral" fill="subtle" register="tag">
                  {roleLabel(role)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p data-testid="card-eligible-roles-empty" className="text-xs text-[color:var(--jd-muted)]">
          {card.status === "done" || card.status === "rejected"
            ? `A ${card.status === "done" ? "completed" : "rejected"} card needs no one.`
            : card.category
              ? "No role works a card of this kind at this status."
              : "Choose a category to see who works it."}
        </p>
      )}
      {card.runConfig && card.eligibleRoles.length > 0 && (
        <p data-testid="card-run" className="mt-1.5 text-xs font-medium">
          {`Worked with ${runLabel(card.runConfig)}`}
        </p>
      )}
      {differ.map((role) => (
        <p key={role} data-testid="card-role-run" data-role={role} className="text-xs font-medium">
          {`${roleLabel(role)}: ${runLabel(card.runConfigs[role])}`}
        </p>
      ))}
      {modGroups(card).map(({ roles, mods }) => (
        <p key={mods.join(",")} data-testid="card-role-mods" data-roles={roles.join(" ")} className="text-xs font-medium">
          {`${roles.map(roleLabel).join(", ")} ${roles.length === 1 ? "follows" : "follow"} `}
          {mods.map((mod, i) => (
            <span key={mod}>
              {i > 0 && ", "}
              <Link href={modSheetHref(mod)} className="underline underline-offset-2" data-mod={mod}>
                {modLabel(mod)}
              </Link>
            </span>
          ))}
        </p>
      ))}
      {/* JAVA-519: the table these come from is global configuration, set under Roles in the
          navigation, not from inside a card. Saying where it went keeps it findable. */}
      <p data-testid="card-eligible-roles-note" className="mt-1.5 text-xs text-[color:var(--jd-muted)]">
        Who may work it now, and with which model: its category&apos;s roles for this status, plus its signals&apos;.
        Each project sets them under Roles, in the navigation.
      </p>
    </div>
  );
}
