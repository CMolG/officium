"use client";

import { useEffect, useMemo, useState } from "react";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { DocSettings, Project } from "../../lib/backlog/types";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** Loads the documentation settings and the project (for the owner check), and saves the window. */
export function useDocSettings(projectId: string) {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<DocSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [days, setDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    repository.getProject(projectId).then(
      (p) => !cancelled && setProject(p),
      (err: unknown) => !cancelled && setRoleError(messageOf(err)),
    );
    repository.getDocSettings(projectId).then(
      (value) => {
        if (cancelled) return;
        setSettings(value);
        setDays(String(value.historyDays));
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, attempt]);

  const isOwner = project?.role === "owner";
  const parsed = Number(days);
  const valid = days.trim() !== "" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 3650;
  const unchanged = settings !== null && parsed === settings.historyDays;
  const shortens = settings !== null && valid && parsed < settings.historyDays;

  async function save() {
    if (!settings || !valid) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const next = await repository.updateDocSettings(projectId, { historyDays: parsed, expectedVersion: settings.version });
      setSettings(next);
      setDays(String(next.historyDays));
      setSaved(true);
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    project, settings, loadError, roleError, shortens, days, setDays, saving, saved, saveError, valid, unchanged, isOwner, save,
    retry: () => setAttempt((n) => n + 1),
    markEdited: (value: string) => {
      setDays(value);
      setSaved(false);
    },
  };
}
