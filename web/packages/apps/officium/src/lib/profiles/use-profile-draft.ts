"use client";

import { useEffect, useState } from "react";

import { DEFAULT_ROLE_MATRIX } from "../backlog/role-config";
import type { RoleMatrix } from "../backlog/role-matrix-types";
import type { ProfileView } from "./profile-types";
import { getProfilesClient } from "./profiles-client";

/**
 * The profile a Work Profile editor edits (JAVA-1627): the saved profile, the draft over it, and the name. A profile
 * that could not be read keeps its error and no draft, so it is never saved over from a blank form.
 */
export function useProfileDraft(profileId: string | null, readFailed: string) {
  const client = getProfilesClient();
  const [saved, setSaved] = useState<ProfileView | null>(null);
  const [draft, setDraft] = useState<RoleMatrix>(DEFAULT_ROLE_MATRIX);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let live = true;
    client.get(profileId).then((profile) => {
      if (!live) return;
      setSaved(profile);
      setDraft(profile.matrix);
      setName(profile.name);
    }, (err: Error) => live && setError(err.message || readFailed));
    return () => {
      live = false;
    };
  }, [client, profileId, readFailed]);

  return { saved, setSaved, draft, setDraft, name, setName, error, setError };
}
