import { useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { OrganizationProfile } from "../../lib/backlog/types";

/** The caller's organization, loaded once: the heading and the people list both read it from here (JAVA-1780). */
export function useOrganizationProfile() {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void repository.getOrganization().then(
      (view) => {
        if (!cancelled) setProfile(view);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repository]);

  /** Rejects with the repository's error code (`organization_name_invalid`), so the heading can word it. */
  async function rename(name: string) {
    const view = await repository.renameOrganization(name);
    setProfile(view);
  }

  return { profile, failed, rename };
}
