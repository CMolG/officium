"use client";

import { useEffect, useState } from "react";

import { isConflict } from "../../../lib/backlog/types";
import { messageOf } from "../../../lib/configuration/project-api";
import { getSharing, setSharing, type SharingSettings } from "../../../lib/configuration/sharing";

/**
 * A project's sharing settings: read by every member, edited as a draft and saved by the owner under their version.
 * `unavailable` is the server not serving the setting yet (the switch then stays off and disabled).
 */
export function useSharing(projectId: string) {
  const [settings, setSettings] = useState<SharingSettings | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [draft, setDraft] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getSharing(projectId).then(
      (value) => {
        if (cancelled) return;
        setUnavailable(value === null);
        setSettings(value);
        setDraft(value?.showWho ?? false);
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, attempt]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    setConflict(false);
    setSaveError(null);
    try {
      const result = await setSharing(projectId, { showWho: draft, expectedVersion: settings.version });
      if (isConflict(result)) {
        setSettings(result.current);
        setDraft(result.current.showWho);
        setConflict(true);
      } else {
        setSettings(result);
        setDraft(result.showWho);
        setSaved(true);
      }
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    ready: settings !== null || unavailable,
    unavailable,
    draft,
    loadError,
    saving,
    saved,
    conflict,
    saveError,
    unchanged: (settings?.showWho ?? false) === draft,
    edit: (value: boolean) => {
      setDraft(value);
      setSaved(false);
    },
    save,
    cancel: () => setDraft(settings?.showWho ?? false),
    retry: () => setAttempt((n) => n + 1),
  };
}
