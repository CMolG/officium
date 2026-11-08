"use client";

import { useId, useState } from "react";

import { Switch, Text } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";
import type { ProfilesClient } from "../../lib/profiles/profiles-client";
import type { ProfilesView } from "../../lib/profiles/profile-types";

/**
 * Shuffle mode on the active profile (card://JAVA-1858): each card's build and deploy run on a nearby model and effort,
 * so the owner can compare how each performs. It never edits the profile, so it works on the built-ins too, and turning
 * it off gives every card its configured cell back: reversible, so it applies at once with no confirmation.
 */
export function ShuffleToggle({ projectId, view, owner, client, onChanged }: {
  projectId: string;
  view: ProfilesView;
  owner: boolean;
  client: ProfilesClient;
  onChanged: (next: ProfilesView) => void;
}) {
  const copy = useCopy().workProfile;
  const hintId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = view.active;
  const on = active?.shuffle ?? false;

  async function toggle(next: boolean) {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await client.activate(projectId, active.profileId, next));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : copy.shuffleFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div data-testid="shuffle-mode" className="flex flex-col gap-1">
      <label className="flex min-h-11 flex-row items-center gap-3">
        <Switch checked={on} disabled={!owner || !active || busy} aria-describedby={hintId}
          aria-busy={busy || undefined} onCheckedChange={(next) => void toggle(next)} />
        <Text className="text-sm font-medium">{on ? copy.shuffleOn : copy.shuffleOff}</Text>
      </label>
      <Text id={hintId} className="text-xs text-[color:var(--jd-muted)]">
        {active ? copy.shuffleHint : copy.shuffleNeedsProfile}
      </Text>
      {error && <Text role="alert" className="text-sm font-medium text-destructive">{error}</Text>}
    </div>
  );
}
