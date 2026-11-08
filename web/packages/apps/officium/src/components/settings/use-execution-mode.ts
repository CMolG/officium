"use client";

import { useEffect, useMemo, useState } from "react";

import type { ExecutionModeSetting, ExecutionPreview } from "../../lib/backlog/execution-mode-repository";
import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { isConflict } from "../../lib/backlog/types";

type Mode = ExecutionModeSetting["mode"];

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/**
 * The project's execution mode (card://JAVA-1873): read by everyone, chosen by the owner and then saved (Cfg-Project,
 * "Work rules, the execution mode"). Switching is reversible and rewrites no card; the owner sees beforehand, from a dry
 * run, how many open cards an epic-by-epic project would work inside epics.
 */
export function useExecutionMode(projectId: string, isOwner: boolean) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [setting, setSetting] = useState<ExecutionModeSetting | null>(null);
  const [draft, setDraft] = useState<Mode | null>(null);
  const [preview, setPreview] = useState<ExecutionPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository.getExecutionMode(projectId).then(
      async (value) => {
        if (cancelled) return;
        setSetting(value);
        setDraft(value.mode);
        if (!isOwner) return;
        const dry = await repository.setExecutionMode(projectId, { expectedVersion: value.version, mode: "epic", dryRun: true });
        if (!cancelled && !isConflict(dry)) setPreview(dry.preview);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, isOwner]);

  function choose(mode: Mode) {
    if (!isOwner || saving) return;
    setDraft(mode);
    setSaved(false);
    setConflict(false);
  }

  function cancel() {
    if (setting) setDraft(setting.mode);
  }

  async function save() {
    if (!setting || !isOwner || saving || draft === null || draft === setting.mode) return;
    setSaving(true);
    setSaved(false);
    setConflict(false);
    setSaveError(null);
    try {
      const result = await repository.setExecutionMode(projectId, { expectedVersion: setting.version, mode: draft });
      if (isConflict(result)) {
        setSetting(result.current.setting);
        setDraft(result.current.setting.mode);
        setConflict(true);
      } else {
        setSetting(result.setting);
        setDraft(result.setting.mode);
        setPreview(result.preview);
        setSaved(true);
      }
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return { setting, draft, preview, loadError, saving, saved, conflict, saveError, choose, cancel, save };
}
