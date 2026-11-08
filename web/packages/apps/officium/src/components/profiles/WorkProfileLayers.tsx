"use client";

import { Text } from "@javadaba/ui";

import { DEFAULT_ROLE_MATRIX } from "../../lib/backlog/role-config";
import { changedCells } from "../../lib/backlog/role-matrix";
import type { RoleMatrixView } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";

/**
 * The layers a project's cards are read under, and how many cells each one changes (JAVA-1627): Officium's defaults,
 * the active work profile on them, then the project's own cells. The base is what the server served, not a guess.
 */
export function WorkProfileLayers({ view, profileName }: { view: RoleMatrixView; profileName: string | null }) {
  const copy = useCopy().workProfile;
  const own = changedCells(view.effective, view.base);
  const text =
    view.activeProfileId === null
      ? copy.layersNoProfile(own)
      : copy.layersWithProfile(profileName ?? copy.profileFallback, changedCells(view.base, DEFAULT_ROLE_MATRIX), own);
  return (
    <Text as="p" data-testid="work-profile-layers" className="max-w-prose text-sm">
      {text}
    </Text>
  );
}
