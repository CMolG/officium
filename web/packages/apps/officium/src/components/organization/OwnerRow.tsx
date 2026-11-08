import { Avatar, Badge, ListRow } from "@javadaba/ui";

import type { OrganizationProfile } from "../../lib/backlog/types";

/** The organization's owner, as the first row of the people list (JAVA-1780). They own every project, so no project chips. */
export function OwnerRow({ owner, nickname }: { owner: OrganizationProfile["owner"]; nickname?: string }) {
  const name = owner.name || owner.email || "You";
  return (
    <li>
      <ListRow>
        <div className="flex min-w-0 flex-1 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
          <Avatar name={name} size="s" />
          <p className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">
            {name}
            {nickname && <span className="ml-1.5 text-xs font-normal text-[color:var(--jd-muted)]">@{nickname}</span>}
          </p>
          <Badge register="tag" tone="accent" fill="subtle" size="xs">
            Owner
          </Badge>
          {owner.email && <span className="min-w-0 text-xs text-[color:var(--jd-muted)] wrap-anywhere max-sm:basis-full max-sm:pl-8">{owner.email}</span>}
        </div>
      </ListRow>
    </li>
  );
}
