"use client";

import { useEffect, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { ArrowUpRight, Bot } from "lucide-react";

import { Table, Text } from "@javadaba/ui";

import { categoryName, percent, profileName, recommendationClauses } from "../../lib/backlog/profile-metrics-format";
import type { ProfileMetrics } from "../../lib/backlog/profile-metrics-types";
import { getProfilesClient } from "../../lib/profiles/profiles-client";
import { cardPath } from "../../lib/backlog/search-links";
import { ProfileTableRow } from "./ProfileTableRow";

/**
 * Contributions by AI work profile (card://JAVA-1527): each profile's reviews, first-time pass, code health,
 * violations, escaped defects and cost with its debt; the reviewing models' catch rate; the cells over the bar,
 * with the stronger model suggested; and the escaped defects, each with its origin and corrective card.
 */
export function ProfileMetricsSection({ profiles, projectId }: { profiles: ProfileMetrics | undefined; projectId: string }) {
  const cardHref = (key: string) => cardPath(projectId, key);
  // A custom profile's name: the metrics carry ids, and the caller's profiles name them.
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    let live = true;
    getProfilesClient().list(projectId).then(
      (view) => live && setNames(Object.fromEntries(view.profiles.map((p) => [p.id, p.name]))),
      () => undefined, // the ids still read; nothing else depends on the names
    );
    return () => {
      live = false;
    };
  }, [projectId]);
  return (
    <section data-testid="profile-metrics" aria-labelledby="profile-metrics-title">
      <h2 id="profile-metrics-title" className="mb-2 flex flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        <Bot size={13} aria-hidden="true" />
        <Text>By AI profile</Text>
      </h2>
      {!profiles || profiles.byProfile.length === 0 ? (
        <Text className="text-sm text-[color:var(--jd-muted)]">
          No card was reviewed under a work profile in this period. Cards count here once an agent moves them out of a phase.
        </Text>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  {["Profile", "Reviewed", "First-time pass", "Code health", "Violations", "Escaped", "Time", "Per clean delivery"].map((h) => (
                    <th key={h} scope="col" data-num={h !== "Profile" || undefined}><Text>{h}</Text></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.byProfile.map((row) => <ProfileTableRow key={row.profileId} row={row} names={names} />)}
              </tbody>
            </Table>
          </div>
          {profiles.reviewerCatch.length > 0 && (
            <ul aria-label="Reviewer catch rate" className="flex flex-col gap-1 text-sm">
              {profiles.reviewerCatch.map((c) => (
                <li key={c.model} className="flex flex-row flex-wrap gap-2">
                  <Text className="font-medium">{c.model}</Text>
                  <Text className="text-[color:var(--jd-muted)]">{`caught ${c.caught}, let through ${c.escaped} (${percent(c.rate)})`}</Text>
                </li>
              ))}
            </ul>
          )}
          <div data-testid="profile-recommendations" className="flex flex-col gap-1 text-sm">
            {profiles.recommendations.length === 0 ? (
              <Text className="text-[color:var(--jd-muted)]">
                {`No cell needs a stronger model: none reached ${percent(profiles.thresholds.violationRate)} of reviews with an architecture or clean-code violation, or ${percent(profiles.thresholds.sendBackRate ?? profiles.thresholds.violationRate)} sent back, over ${profiles.thresholds.minReviewed} reviews.`}
              </Text>
            ) : (
              profiles.recommendations.map((r) => (
                <Text key={`${r.profileId}-${r.category}-${r.model}`} role="note" className="flex flex-row items-center gap-1.5">
                  <ArrowUpRight size={13} className="shrink-0 text-destructive" aria-hidden="true" />
                  {`${profileName(r.profileId, names)}, ${categoryName(r.category)}, Action phase: raise ${r.model} to ${r.raiseTo} (${recommendationClauses(r).join("; ")}).`}
                </Text>
              ))
            )}
          </div>
          {profiles.escapedDefects.length > 0 && (
            <ul aria-label="Escaped defects" className="flex flex-col gap-1 text-sm">
              {profiles.escapedDefects.map((e) => (
                <li key={`${e.originKey}-${e.correctiveKey}`} className="flex flex-row flex-wrap items-center gap-1.5">
                  {e.originKey ? <Link href={cardHref(e.originKey)} className="font-mono text-xs underline">{e.originKey}</Link> : <Text>Unknown card</Text>}
                  <Text className="text-[color:var(--jd-muted)]">{`let a defect through ${e.escapedIn}, fixed by`}</Text>
                  <Link href={cardHref(e.correctiveKey)} className="font-mono text-xs underline">{e.correctiveKey}</Link>
                  <Text className="text-[color:var(--jd-muted)]">{`(${profileName(e.profileId, names)})`}</Text>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
