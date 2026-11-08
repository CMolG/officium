"use client";

import { useEffect, useMemo, useReducer, useState, type ReactNode } from "react";

import { Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { changedCells, overridesFrom } from "../../lib/backlog/role-matrix";
import { forgetRoleMatrix, publishRoleMatrix, readRoleMatrix } from "../../lib/backlog/role-matrix-cache";
import { isConflict, type Project } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import { ConfigPage } from "../configuration/ConfigPage";
import { ConfigLoadError } from "../configuration/ConfigLoadError";
import { ConfigLoading } from "../configuration/ConfigLoading";
import { reduce } from "../../lib/profiles/project-cells-reducer";
import { getProfilesClient } from "../../lib/profiles/profiles-client";
import { WorkProfileLayers } from "./WorkProfileLayers";
import { CellMatrix } from "./CellMatrix";
import { MatrixEditingBar } from "./MatrixEditingBar";
import { PlanLockedNotice } from "./PlanLockedNotice";
import { CATEGORY_ROWS, SIGNAL_ROWS } from "../backlog/matrix-rows";
import { NoticeLine, loadErrorText } from "../backlog/RolesNotice";

/**
 * Which roles work this project's cards (JAVA-243), under the workspace's settings since JAVA-519: the role matrix the agents read, category and
 * signal rows by phase, and the owner's override of it (officium-api.md §8.9). A draft is edited
 * here and saved whole; the server keeps only the cells that differ from the default.
 */
export function ProjectCells({ projectId, header, reloadKey = 0 }: { projectId: string; header?: ReactNode; reloadKey?: number }) {
  const copy = useCopy().workProfile;
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [liveTick, setLiveTick] = useState(0);
  const [state, dispatch] = useReducer(reduce, { base: null, draft: null, notice: null });
  const [saving, setSaving] = useState(false);
  // The active profile's name, so the page can say which profile a cell sits on (JAVA-1627); null while unknown.
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // A new base (a profile switched) is read fresh; the draft over it is kept by the reducer's rebase.
    if (reloadKey > 0) forgetRoleMatrix(repository, projectId);
    const profiles = getProfilesClient().list(projectId).catch(() => null);
    void Promise.all([repository.getProject(projectId), readRoleMatrix(repository, projectId), profiles]).then(
      ([proj, view, list]) => {
        if (cancelled) return;
        setProject(proj);
        setProfileName(list?.active?.name ?? null);
        setLoadError(null);
        dispatch({ type: "loaded", view });
      },
      (err) => {
        if (!cancelled) setLoadError(loadErrorText(err));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt, liveTick, reloadKey]);

  // officium-api.md §4: a matrix saved elsewhere (another tab, an agent through the MCP) reaches
  // this view as `project.roleMatrix`; a reconnect may have missed one, so it re-reads too.
  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (event.type === "project.roleMatrix" || event.type === "stream.ready") {
          forgetRoleMatrix(repository, projectId);
          setLiveTick((n) => n + 1);
        }
      }),
    [projectId, repository],
  );

  const { base, draft, notice } = state;
  const isOwner = project?.role === "owner";
  const pending = base && draft ? changedCells(draft, base.effective) : 0;
  const atDefaults = base && draft ? changedCells(draft, base.base) === 0 : true;
  // Reset goes back to the layer under the project's cells, and every label names it: the active profile's, else Officium's defaults.
  const baseName = base?.activeProfileId !== null ? (profileName ?? copy.profileFallback) : copy.defaults;

  async function save() {
    if (!base || !draft || pending === 0 || saving) return;
    setSaving(true);
    try {
      const result = await repository.setRoleMatrix(projectId, {
        expectedVersion: base.version,
        // Against the base the cells sit on, not the defaults: a profile's cells are not the project's (JAVA-1627).
        overrides: overridesFrom(draft, base.base),
      });
      const view = isConflict(result) ? result.current : result;
      publishRoleMatrix(repository, projectId, view);
      dispatch(isConflict(result) ? { type: "conflict", view } : { type: "saved", view });
    } catch (err) {
      dispatch({ type: "error", message: err instanceof Error ? err.message : copy.saveRolesFailed });
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    try {
      forgetRoleMatrix(repository, projectId);
      dispatch({ type: "discard", view: await readRoleMatrix(repository, projectId) });
    } catch (err) {
      dispatch({ type: "error", message: err instanceof Error ? err.message : copy.reachFailed });
    }
  }

  const page = (children: ReactNode) => (
    <ConfigPage wide title={copy.heading} lede="Which role, model and effort works each kind of card in each phase.">
      {children}
    </ConfigPage>
  );

  if (loadError && !draft) {
    return page(
      <ConfigLoadError title={copy.loadRolesFailed} detail={loadError} retryLabel={copy.tryAgain} onRetry={() => setAttempt((n) => n + 1)} />,
    );
  }

  if (!base || !draft) {
    return page(<ConfigLoading label={copy.loadingCells} rows={6} />);
  }

  return page(
    <>
      {header}

      <div className="mb-6 flex flex-col gap-3">
        <Text as="p" className="max-w-prose text-sm text-[color:var(--jd-muted)]">
          {copy.introCells}
        </Text>
        <Text as="p" data-testid="role-matrix-version" className="text-xs text-[color:var(--jd-muted)]">
          {base.version === 0 ? copy.versionZero : copy.versionOwn(base.version)}
        </Text>
        <WorkProfileLayers view={base} profileName={profileName} />
        {!isOwner && (
          <Text as="p" role="note" className="rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2 text-sm font-medium">
            {copy.ownerCellsNote}
          </Text>
        )}
      </div>

      {isOwner &&
        (base.editable ? (
          <MatrixEditingBar
            pending={pending}
            atDefaults={atDefaults}
            baseName={baseName}
            saving={saving}
            onResetAll={() => dispatch({ type: "resetAll" })}
            onDiscard={() => void discard()}
            onSave={() => void save()}
          />
        ) : (
          <div className="mb-6">
            <PlanLockedNotice overridesInactive={base.overridesInactive} />
          </div>
        ))}

      {notice && <NoticeLine notice={notice} />}
      {loadError && (
        <Text as="p" role="alert" className="mb-6 text-sm font-medium text-destructive">
          {copy.refreshFailed(loadError)}
        </Text>
      )}

      <CellMatrix
        sections={[
          { heading: copy.byCategory, explanation: copy.byCategoryExplanation, rows: CATEGORY_ROWS },
          { heading: copy.bySignal, explanation: copy.bySignalExplanation, rows: SIGNAL_ROWS },
        ]}
        draft={draft}
        base={base.base}
        baseName={baseName}
        markCustom
        editable={isOwner && base.editable}
        foldAlways={false}
        projectId={projectId}
        onChange={dispatch}
      />
    </>,
  );
}
