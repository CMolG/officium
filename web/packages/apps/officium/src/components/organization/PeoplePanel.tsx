"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, EmptyState, ListRow, Skeleton, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { OrganizationProfile, Person } from "../../lib/backlog/types";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { OwnerRow } from "./OwnerRow";

/**
 * Everyone with access to a project the caller owns (Cfg-Org "People"). The owner comes first, from the organization
 * (JAVA-1780); each person has their email and a chip per project: project, role and, when it comes from a team, "team".
 */
export function PeoplePanel({ owner, onCount }: { owner: OrganizationProfile["owner"] | null; onCount: (count: number) => void }) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [nicknames, setNicknames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Nicknames are extra: the list shows without them if they don't load.
    void repository.getNicknames().then(
      (view) => {
        if (!cancelled) setNicknames(new Map(view.nicknames.map((n) => [n.accountId, n.nickname])));
      },
      () => undefined,
    );
    void repository.listPeople().then(
      (list) => {
        if (cancelled) return;
        setPeople(list);
        setError(null);
        onCount(list.length);
      },
      (err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load people.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repository, attempt, onCount]);

  if (error) return <ConfigLoadError title="Couldn't load the people" detail={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (people === null) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading the people">
        <Skeleton shape="block" className="h-16 w-full" />
        <Skeleton shape="block" className="h-16 w-full" />
      </div>
    );
  }

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {owner && <OwnerRow owner={owner} nickname={nicknames.get(owner.accountId)} />}
        {people.map((person) => (
          <li key={person.accountId}>
            <ListRow className="flex-col items-stretch gap-2">
              {/* The email drops under the name on a phone instead of squeezing it to a few letters. */}
              <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
                <Avatar name={person.name} size="s" />
                <p className="m-0 min-w-0 flex-1 truncate text-sm font-semibold">
                  {person.name}
                  {nicknames.has(person.accountId) && (
                    <span className="ml-1.5 text-xs font-normal text-[color:var(--jd-muted)]">@{nicknames.get(person.accountId)}</span>
                  )}
                </p>
                <span className="min-w-0 text-xs text-[color:var(--jd-muted)] wrap-anywhere max-sm:basis-full max-sm:pl-8">{person.email}</span>
              </div>
              <ul className="m-0 flex list-none flex-row flex-wrap gap-1.5 p-0">
                {person.projects.map((p) => (
                  <li key={`${p.projectId}-${p.teamId ?? "direct"}`} title={p.via === "team" ? "Granted through a team" : "Granted directly"}>
                    <Badge register="chip" tone="neutral" fill="subtle" size="sm">
                      <Text>
                        {p.name} · {p.role}
                        {p.via === "team" ? " (team)" : ""}
                      </Text>
                    </Badge>
                  </li>
                ))}
              </ul>
            </ListRow>
          </li>
        ))}
      </ul>
      {people.length === 0 && (
        <div className="mt-2">
          <EmptyState title="Nobody else has access to your projects yet">Share a project through a team, or invite someone from a project&apos;s Members panel.</EmptyState>
        </div>
      )}
    </>
  );
}
