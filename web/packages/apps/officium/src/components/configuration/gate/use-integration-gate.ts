"use client";

import { useCallback, useEffect, useState } from "react";

import { isConflict } from "../../../lib/backlog/types";
import { getGate, setGate, type GateRules, type GateSettings } from "../../../lib/configuration/integration-gate";
import { messageOf } from "../../../lib/configuration/project-api";

/** The integration gate's rules: read by every member, edited as a draft and saved by the owner under their version. */
export function useIntegrationGate(projectId: string) {
  const [settings, setSettings] = useState<GateSettings | null>(null);
  const [draft, setDraft] = useState<GateRules | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getGate(projectId).then(
      (value) => {
        if (cancelled) return;
        setSettings(value);
        setDraft(value.rules);
        setLoadError(null);
      },
      (err: unknown) => !cancelled && setLoadError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, attempt]);

  const edit = useCallback((next: GateRules) => {
    setDraft(next);
    setSaved(false);
  }, []);

  const queueMax = draft?.deployQueue.max;
  const queueValid = queueMax === undefined || (Number.isInteger(queueMax) && queueMax >= 1 && queueMax <= 500);
  const unchanged = settings === null || JSON.stringify(settings.rules) === JSON.stringify(draft);

  async function save() {
    if (!settings || !draft || !queueValid) return;
    setSaving(true);
    setSaved(false);
    setConflict(false);
    setSaveError(null);
    try {
      const result = await setGate(projectId, { expectedVersion: settings.version, rules: draft });
      if (isConflict(result)) {
        setSettings(result.current);
        setDraft(result.current.rules);
        setConflict(true);
      } else {
        setSettings(result);
        setDraft(result.rules);
        setSaved(true);
      }
    } catch (err) {
      setSaveError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return {
    settings,
    draft,
    loadError,
    saving,
    saved,
    conflict,
    saveError,
    queueValid,
    unchanged,
    edit,
    save,
    cancel: () => settings && setDraft(settings.rules),
    retry: () => setAttempt((n) => n + 1),
  };
}
